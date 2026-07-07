"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  parseIngredientLines,
  sortCategoriesForMenu,
  type LocalMenuCategory,
  type LocalMenuProduct,
  type LocalMenuState,
} from "@/lib/local-menu";
import { getPrimaryMenuDisplayPrice } from "@/lib/product-pricing";
import type { TenantFulfillmentFlags } from "@/lib/fulfillment";
import {
  getBusinessClosedMessage,
  getBusinessHoursRangeLabel,
  isBusinessOpenNow,
} from "@/lib/business-hours";
import CartCheckoutModal from "@/components/public-menu/cart-checkout-modal";
import PublicMenuPwaCard, { usePublicMenuPwaInstall } from "@/components/public-menu/public-menu-pwa-card";
import PwaIosInstallHelp from "@/components/public-menu/pwa-ios-install-help";
import SiteLogo from "@/components/site-logo";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

function ProductWarningIcons({
  product,
  limit = 4,
}: {
  product: LocalMenuProduct;
  limit?: number;
}) {
  if (product.warningBadges.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1">
      {product.warningBadges.slice(0, limit).map((badge) => (
        <span
          key={badge.key}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow-sm backdrop-blur"
          title={badge.label}
        >
          <span className="material-symbols-outlined text-[16px]">{badge.icon}</span>
        </span>
      ))}
    </div>
  );
}

type CartEntry = {
  productId: string;
  qty: number;
  removedIngredients: string[];
};

type CartState = Record<string, CartEntry>;

type CartLine = {
  key: string;
  product: LocalMenuProduct;
  qty: number;
  removedIngredients: string[];
};

function buildCartKey(productId: string, removedIngredients: string[]): string {
  return `${productId}::${removedIngredients.join("|")}`;
}

type PublicMenuClientProps = {
  slug: string;
  businessName: string;
  businessLogoUrl: string;
  businessCoverImageUrl: string;
  publicDescription: string;
  googleMapsUrl: string;
  hoursPair: { open: string; close: string } | null;
  initialOpenStatus: boolean | null;
  initialClosedMessage: string;
  paymentFlags: TenantPaymentFlags;
  fulfillmentFlags: TenantFulfillmentFlags;
  orderSource?: "qr_menu" | "marketplace";
  /** Masa menusu — dine_in siparis akisi */
  tableNumber?: number;
  /** Garson paneli — siparis API /api/garson/orders */
  waiterMode?: boolean;
  initialMenu: LocalMenuState;
};

function subscribeOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getClientOnlineStatus(): boolean {
  return navigator.onLine;
}

export default function PublicMenuClient({
  slug: rawSlug,
  businessName,
  businessLogoUrl,
  businessCoverImageUrl,
  publicDescription,
  googleMapsUrl,
  hoursPair,
  initialOpenStatus,
  initialClosedMessage,
  paymentFlags,
  fulfillmentFlags,
  orderSource = "qr_menu",
  tableNumber,
  waiterMode = false,
  initialMenu,
}: PublicMenuClientProps) {
  const slug = rawSlug.toLowerCase();
  const isTableMenu = tableNumber != null && tableNumber > 0;
  const [menu] = useState<LocalMenuState>(initialMenu);
  const [title] = useState<string>(businessName);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [cart, setCart] = useState<CartState>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [customizeProduct, setCustomizeProduct] = useState<LocalMenuProduct | null>(null);
  const [removedIngredientsDraft, setRemovedIngredientsDraft] = useState<string[]>([]);
  const [previewProduct, setPreviewProduct] = useState<LocalMenuProduct | null>(null);
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getClientOnlineStatus, () => true);
  const pwaInstall = usePublicMenuPwaInstall();

  useEffect(() => {
    if (!pwaInstall.showIosHelp || pwaInstall.isInstalled) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pwaInstall.showIosHelp, pwaInstall.isInstalled]);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const openStatus = useMemo(() => {
    if (clockTick === 0) return initialOpenStatus;
    if (!hoursPair) return null;
    return isBusinessOpenNow(hoursPair.open, hoursPair.close);
  }, [hoursPair, clockTick, initialOpenStatus]);
  const hoursRangeLabel = useMemo(() => {
    return hoursPair ? getBusinessHoursRangeLabel(hoursPair.open, hoursPair.close) : null;
  }, [hoursPair]);
  const orderingEnabled = openStatus !== false && isOnline;
  const closedMessage = !isOnline
    ? "Cevrimdisisiniz. Menuyu inceleyebilirsiniz ancak siparis gondermek icin internet baglantisi gerekir."
    : clockTick > 0 && hoursPair
      ? getBusinessClosedMessage(hoursPair.open, hoursPair.close)
      : initialClosedMessage;

  const visibleCategories = useMemo(
    () => sortCategoriesForMenu(menu.categories.filter((c) => !c.hidden)),
    [menu.categories],
  );
  const effectiveTab = tab === "all" || visibleCategories.some((c) => c.id === tab) ? tab : "all";

  const visibleProducts = useMemo(() => {
    const catIds = new Set(visibleCategories.map((c) => c.id));
    return menu.products.filter((p) => !p.hidden && catIds.has(p.categoryId));
  }, [menu.products, visibleCategories]);

  const filteredByTab = useMemo(() => {
    if (effectiveTab === "all") return visibleProducts;
    return visibleProducts.filter((p) => p.categoryId === effectiveTab);
  }, [visibleProducts, effectiveTab]);

  const searchLower = search.trim().toLowerCase();
  const gridProducts = useMemo(() => {
    if (!searchLower) return filteredByTab;
    return filteredByTab.filter((p) => {
      const ing = parseIngredientLines(p.ingredients).join(" ").toLowerCase();
      return (
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        ing.includes(searchLower)
      );
    });
  }, [filteredByTab, searchLower]);

  const heroProduct = useMemo(() => {
    return visibleProducts.find((p) => p.signatureDish) ?? null;
  }, [visibleProducts]);

  const cartLines: CartLine[] = useMemo(() => {
    const lines: CartLine[] = [];
    for (const [key, entry] of Object.entries(cart)) {
      if (entry.qty <= 0) continue;
      const product = visibleProducts.find((p) => p.id === entry.productId);
      if (product) {
        lines.push({
          key,
          product,
          qty: entry.qty,
          removedIngredients: entry.removedIngredients,
        });
      }
    }
    return lines;
  }, [cart, visibleProducts]);

  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce(
    (s, l) => s + getPrimaryMenuDisplayPrice(l.product, fulfillmentFlags) * l.qty,
    0,
  );

  function addConfiguredProductToCart(productId: string, removedIngredients: string[] = []) {
    if (!orderingEnabled) return;
    const key = buildCartKey(productId, removedIngredients);
    setCart((c) => ({
      ...c,
      [key]: {
        productId,
        qty: (c[key]?.qty ?? 0) + 1,
        removedIngredients,
      },
    }));
  }

  function requestAddToCart(product: LocalMenuProduct) {
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    const removableIngredients = parseIngredientLines(product.ingredients);
    if (removableIngredients.length === 0) {
      addConfiguredProductToCart(product.id, []);
      return;
    }
    setCustomizeProduct(product);
    setRemovedIngredientsDraft([]);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function categoryLabel(c: LocalMenuCategory): string {
    return c.name;
  }

  const customizationIngredients = useMemo(
    () => (customizeProduct ? parseIngredientLines(customizeProduct.ingredients) : []),
    [customizeProduct],
  );

  function confirmCustomizationAndAdd() {
    if (!customizeProduct) return;
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    addConfiguredProductToCart(customizeProduct.id, removedIngredientsDraft);
    setCustomizeProduct(null);
    setRemovedIngredientsDraft([]);
  }

  const activeCategory = effectiveTab !== "all" ? visibleCategories.find((c) => c.id === effectiveTab) : null;
  const sectionHeading = activeCategory?.name ?? "Sizin İçin Seçtiklerimiz";

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background pb-28 font-body text-on-background">
      <header className="bg-surface-container-lowest px-6 pb-6 pt-10">
        {businessCoverImageUrl ? (
          <div className="-mx-6 mb-6 overflow-hidden">
            <div className="relative h-44">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={businessCoverImageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            </div>
          </div>
        ) : null}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {businessLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl border border-surface-container-high bg-white object-contain shadow-sm"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-primary">{title}</h1>
              {isTableMenu && !waiterMode ? (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                  Masa {tableNumber}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {openStatus === null ? (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-secondary/40" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
                      Çalışma saati bilgisi yok
                    </span>
                  </>
                ) : openStatus ? (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                      Şu an açık
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-widest text-amber-800">
                      Şu an kapalı
                    </span>
                  </>
                )}
                {hoursRangeLabel ? (
                  <span className="rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-semibold text-secondary">
                    {hoursRangeLabel}
                  </span>
                ) : null}
              </div>
              {publicDescription ? (
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">{publicDescription}</p>
              ) : null}
              {openStatus === false ? (
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-amber-900">
                  {closedMessage}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-2xl bg-surface-container-high p-3 text-on-surface transition-transform active:scale-95"
                aria-label="Konumu Google Maps'te ac"
                title="Konum"
              >
                <span className="material-symbols-outlined">location_on</span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void pwaInstall.handleInstallClick()}
              disabled={pwaInstall.isInstalled}
              className={[
                "inline-flex min-h-11 items-center justify-center rounded-2xl border px-3 py-2 text-xs font-bold transition",
                pwaInstall.isInstalled
                  ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-primary/15 bg-primary/8 text-primary hover:bg-primary/12",
              ].join(" ")}
              aria-label={pwaInstall.buttonLabel}
              title={pwaInstall.buttonLabel}
            >
              <span className="material-symbols-outlined text-[18px]">
                {pwaInstall.isInstalled ? "check_circle" : pwaInstall.isIos ? "help" : "download"}
              </span>
            </button>
          </div>
        </div>
        <div className="relative mt-4">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
            search
          </span>
          <input
            className="w-full rounded-2xl border-none bg-surface-container-low py-4 pl-12 pr-4 font-medium text-on-surface placeholder:text-secondary focus:ring-2 focus:ring-primary/20"
            placeholder="Lezzet keşfine çık..."
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
      </header>

      {visibleCategories.length > 0 ? (
        <nav className="sticky top-0 z-50 border-b border-surface-container-highest bg-surface-container-lowest/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container-lowest/80">
          <div className="flex space-x-6 overflow-x-auto scroll-smooth px-6 py-4">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={[
                "flex-shrink-0 pb-1 font-headline text-lg tracking-tight",
                effectiveTab === "all"
                  ? "border-b-2 border-primary font-bold text-primary"
                  : "font-medium text-secondary transition-colors hover:text-primary",
              ].join(" ")}
            >
              Popüler
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                className={[
                  "flex-shrink-0 pb-1 font-headline text-lg tracking-tight",
                  effectiveTab === c.id
                    ? "border-b-2 border-primary font-bold text-primary"
                    : "font-medium text-secondary transition-colors hover:text-primary",
                ].join(" ")}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <main className="space-y-8 overflow-x-hidden px-6 pt-6">
        {heroProduct ? (
          <section className="grid grid-cols-1 gap-4">
            <div className="group relative h-64 overflow-hidden rounded-3xl">
              {heroProduct.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="absolute inset-0 h-full w-full object-cover"
                  src={heroProduct.imageDataUrl}
                  alt=""
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary-container/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="mb-2 inline-block rounded-md bg-primary px-2 py-1 text-[10px] font-black uppercase text-white">
                  İmza lezzet
                </span>
                <h2 className="font-headline text-2xl font-extrabold leading-tight text-white">{heroProduct.name}</h2>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/80 line-clamp-2">
                    {heroProduct.description ||
                      parseIngredientLines(heroProduct.ingredients).slice(0, 2).join(" · ")}
                  </p>
                  <span className="text-xl font-black text-white">{formatTry(getPrimaryMenuDisplayPrice(heroProduct, fulfillmentFlags))}</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section>
          <h3
            className={[
              "flex items-center gap-2 font-headline text-xl font-bold",
              activeCategory?.description ? "mb-2" : "mb-6",
            ].join(" ")}
          >
            {sectionHeading}
            <span className="h-1 w-12 rounded-full bg-primary" />
          </h3>
          {activeCategory?.description ? (
            <p className="mb-6 text-sm leading-relaxed text-secondary">{activeCategory.description}</p>
          ) : null}
          {gridProducts.length === 0 ? (
            <p className="rounded-2xl bg-surface-container-low px-4 py-6 text-center text-sm text-secondary">
              {visibleProducts.length === 0
                ? "Bu işletme için henüz görünür ürün yok. Panelden menü ekleyebilirsiniz."
                : "Aramanızla eşleşen ürün yok."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {gridProducts.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-3xl bg-surface-container-lowest p-3 transition-transform duration-200 active:scale-95"
                >
                  <div className="relative mb-3 h-40 overflow-hidden rounded-2xl">
                    <button
                      type="button"
                      className="block h-full w-full text-left"
                      aria-label={`${p.name} detaylarını aç`}
                      onClick={() => setPreviewProduct(p)}
                    >
                      {p.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" src={p.imageDataUrl} alt="" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-container-low text-secondary">
                          <span className="material-symbols-outlined text-4xl opacity-40">restaurant</span>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur"
                      aria-label={favorites.has(p.id) ? "Favoriden çıkar" : "Favorilere ekle"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProduct(null);
                        toggleFavorite(p.id);
                      }}
                    >
                      <span
                        className={[
                          "material-symbols-outlined text-lg",
                          favorites.has(p.id) ? "text-primary" : "text-secondary",
                        ].join(" ")}
                        style={favorites.has(p.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        favorite
                      </span>
                    </button>
                    <ProductWarningIcons product={p} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewProduct(p)}
                    className="block w-full text-left"
                  >
                    <h4 className="line-clamp-1 text-sm font-bold text-on-surface">{p.name}</h4>
                  </button>
                  <p className="mb-3 min-h-[4.5rem] text-[13px] leading-relaxed text-secondary line-clamp-4">
                    {p.description ||
                      parseIngredientLines(p.ingredients)
                        .slice(0, 3)
                        .join(" · ")}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-primary">{formatTry(getPrimaryMenuDisplayPrice(p, fulfillmentFlags))}</span>
                    <button
                      type="button"
                      className={[
                        "rounded-xl p-2 text-white",
                        orderingEnabled ? "bg-primary-container" : "cursor-not-allowed bg-surface-container-high text-secondary",
                      ].join(" ")}
                      aria-label={`Sepete ekle: ${p.name}`}
                      aria-disabled={!orderingEnabled}
                      title={orderingEnabled ? undefined : "Restoran kapalı"}
                      disabled={!orderingEnabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        requestAddToCart(p);
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {googleMapsUrl ? (
          <section className="rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-background">Konum</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary">
                  Restoran konumunu Google Maps uzerinde acabilir ve yol tarifi alabilirsiniz.
                </p>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-primary/15 bg-primary/8 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/12"
              >
                Haritada ac
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </a>
            </div>
          </section>
        ) : null}
        {!waiterMode && !isTableMenu ? (
        <PublicMenuPwaCard businessName={title} controller={pwaInstall} showAction={false} />
        ) : null}
        {!isOnline ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
            <p className="text-sm font-semibold text-amber-900">Cevrimdisi gorunum</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
              Son gorulen menu icerigi acildi. Yeni siparis gondermek ve guncel degisiklikleri almak icin internet
              baglantisi gereklidir.
            </p>
          </section>
        ) : null}
        <footer className="rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="pointer-events-none origin-left scale-[0.56]">
                <SiteLogo variant="compact" />
              </div>
              <p className="-mt-5 text-sm font-semibold text-on-background">Bu menü KendiSepetim ile oluşturuldu.</p>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                Kendi sepetini yapmak için hemen göz at.
              </p>
            </div>
            <a
              href="https://kendisepetim.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-primary/15 bg-primary/8 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/12"
            >
              İncele
              <span className="material-symbols-outlined text-[16px]">north_east</span>
            </a>
          </div>
        </footer>
      </main>

      {cartCount > 0 ? (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => {
              if (!orderingEnabled) {
                window.alert(closedMessage);
                return;
              }
              setCheckoutOpen(true);
            }}
            className={[
              "flex items-center gap-3 rounded-2xl p-4 text-white shadow-2xl transition-transform",
              orderingEnabled
                ? "bg-gradient-to-b from-[#bc000c] to-[#e71418] active:scale-95"
                : "cursor-not-allowed bg-surface-container-high text-secondary shadow-none",
            ].join(" ")}
            aria-label={`Sepet: ${cartCount} ürün, ${formatTry(cartTotal)}`}
            aria-disabled={!orderingEnabled}
            title={orderingEnabled ? undefined : "Restoran kapalı"}
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="text-sm font-bold">
              {cartCount} Ürün — {formatTry(cartTotal)}
            </span>
          </button>
        </div>
      ) : null}

      <CartCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        setCart={setCart}
        visibleProducts={visibleProducts}
        paymentFlags={paymentFlags}
        fulfillmentFlags={fulfillmentFlags}
        orderSource={isTableMenu ? "table_qr" : orderSource}
        tableNumber={tableNumber}
        waiterMode={waiterMode}
        subdomain={slug}
        orderingEnabled={orderingEnabled}
        closedMessage={closedMessage}
      />
      {customizeProduct ? (
        <ProductCustomizeModal
          product={customizeProduct}
          removableIngredients={customizationIngredients}
          removedIngredients={removedIngredientsDraft}
          onToggleIngredient={(ingredient) =>
            setRemovedIngredientsDraft((prev) =>
              prev.includes(ingredient) ? prev.filter((x) => x !== ingredient) : [...prev, ingredient],
            )
          }
          onClose={() => {
            setCustomizeProduct(null);
            setRemovedIngredientsDraft([]);
          }}
          onConfirm={confirmCustomizationAndAdd}
          orderingEnabled={orderingEnabled}
        />
      ) : null}
      {previewProduct ? (
        <ProductPreviewModal
          product={previewProduct}
          fulfillmentFlags={fulfillmentFlags}
          onClose={() => setPreviewProduct(null)}
          onAddToCart={() => {
            setPreviewProduct(null);
            requestAddToCart(previewProduct);
          }}
          orderingEnabled={orderingEnabled}
        />
      ) : null}

      {pwaInstall.isIos && pwaInstall.showIosHelp && !pwaInstall.isInstalled ? (
        <PwaIosInstallHelp
          businessName={title}
          variant="sheet"
          onDismiss={pwaInstall.dismissIosHelp}
        />
      ) : null}
    </div>
  );
}

function ProductPreviewModal({
  product,
  fulfillmentFlags,
  onClose,
  onAddToCart,
  orderingEnabled,
}: {
  product: LocalMenuProduct;
  fulfillmentFlags: TenantFulfillmentFlags;
  onClose: () => void;
  onAddToCart: () => void;
  orderingEnabled: boolean;
}) {
  const ingredientLines = parseIngredientLines(product.ingredients);

  return (
    <div className="fixed inset-0 z-[184] flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl sm:rounded-2xl">
        <div className="relative h-72 shrink-0 overflow-hidden bg-surface-container-low">
          {product.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-secondary/50">
              <span className="material-symbols-outlined text-6xl">restaurant</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-on-background shadow-sm backdrop-blur"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-headline text-2xl font-extrabold text-on-background">{product.name}</h2>
              <p className="mt-2 text-lg font-black text-primary">{formatTry(getPrimaryMenuDisplayPrice(product, fulfillmentFlags))}</p>
            </div>
          </div>
          {product.warningBadges.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Uyarilar</h3>
              <ul className="mt-2 space-y-2">
                {product.warningBadges.map((badge) => (
                  <li
                    key={badge.key}
                    className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3 text-sm text-on-background"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">{badge.icon}</span>
                    <span>
                      <span className="block font-medium">{badge.label}</span>
                      {badge.description ? (
                        <span className="mt-0.5 block text-xs leading-relaxed text-secondary">{badge.description}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {product.description ? (
            <p className="mt-4 text-sm leading-7 text-on-background/85">{product.description}</p>
          ) : null}
          {ingredientLines.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">İçindekiler</h3>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-secondary">
                {ingredientLines.map((line) => (
                  <li key={line} className="rounded-xl bg-surface-container-low px-3 py-2">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!orderingEnabled}
            className={[
              "w-full rounded-2xl py-3.5 text-sm font-bold shadow-lg transition",
              orderingEnabled
                ? "bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white active:scale-[0.98]"
                : "cursor-not-allowed bg-surface-container-high text-secondary shadow-none",
            ].join(" ")}
          >
            {orderingEnabled ? "Sepete ekle" : "Restoran kapalı"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCustomizeModal({
  product,
  removableIngredients,
  removedIngredients,
  onToggleIngredient,
  onClose,
  onConfirm,
  orderingEnabled,
}: {
  product: LocalMenuProduct;
  removableIngredients: string[];
  removedIngredients: string[];
  onToggleIngredient: (ingredient: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  orderingEnabled: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[185] flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl sm:rounded-2xl">
        <div className="border-b border-surface-container-high px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-on-background">{product.name}</h2>
          <p className="mt-1 text-sm text-secondary">
            İstemediğiniz malzemeleri çıkarabilirsiniz. Hiçbir şey seçmezseniz ürün standart gelir.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {removableIngredients.map((ingredient) => (
              <label
                key={ingredient}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-surface-container-high bg-white px-3 py-3"
              >
                <input
                  type="checkbox"
                  checked={removedIngredients.includes(ingredient)}
                  onChange={() => onToggleIngredient(ingredient)}
                  className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-on-background">{ingredient}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!orderingEnabled}
            className={[
              "w-full rounded-2xl py-3.5 text-sm font-bold shadow-lg transition",
              orderingEnabled
                ? "bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white active:scale-[0.98]"
                : "cursor-not-allowed bg-surface-container-high text-secondary shadow-none",
            ].join(" ")}
          >
            {orderingEnabled ? "Sepete ekle" : "Restoran kapalı"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl border border-surface-container-highest py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container-low hover:text-on-background"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
