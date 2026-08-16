"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  parseIngredientLines,
  sortCategoriesForMenu,
  type LocalMenuCategory,
  type LocalMenuProduct,
  type LocalMenuState,
} from "@/lib/local-menu";
import {
  getPrimaryMenuDisplayPrice,
  getPrimaryMenuDisplayPriceWithVariations,
} from "@/lib/product-pricing";
import {
  hasVariations,
  sumVariationDeltas,
  type SelectedVariation,
  type VariationGroup,
  type VariationOption,
} from "@/lib/menu-variations";
import {
  buildCartKey,
  buildCartLines,
  type CartLine,
  type CartState,
} from "@/lib/public-cart";
import type { FulfillmentType, TenantFulfillmentFlags } from "@/lib/fulfillment";
import {
  getBusinessClosedMessage,
  getBusinessHoursRangeLabel,
  isBusinessOpenNow,
} from "@/lib/business-hours";
import CartCheckoutModal from "@/components/public-menu/cart-checkout-modal";
import PublicMenuPwaCard, { usePublicMenuPwaInstall } from "@/components/public-menu/public-menu-pwa-card";
import PwaIosInstallHelp from "@/components/public-menu/pwa-ios-install-help";
import QrMenuHeaderActions from "@/components/public-menu/qr-menu-header-actions";
import { isRestaurantMenuPwaHost } from "@/lib/pwa-host";
import SiteLogo from "@/components/site-logo";
import CustomerChrome, { CustomerIdentityChip } from "@/components/musteri/customer-chrome";
import CustomerNotificationsPanel from "@/components/musteri/customer-notifications-panel";
import {
  isProductFavorited,
  toggleGuestProductFavorite,
  toggleGuestRestaurantFavorite,
  isRestaurantFavorited,
} from "@/lib/guest-favorites";
import { closedMessageForLocale } from "@/lib/menu-i18n";
import { useMenuT } from "@/lib/use-menu-locale";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";
import {
  clearMarketplaceCart,
  confirmRestaurantCartSwitch,
  getMarketplaceCart,
  persistMenuCartToMarketplace,
  type MarketplaceCartDetail,
} from "@/lib/marketplace-cart";

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

function toSelectedVariation(group: VariationGroup, option: VariationOption): SelectedVariation {
  return {
    groupId: group.id,
    groupName: group.name,
    optionId: option.id,
    optionLabel: option.label,
    priceDelta: option.priceDelta,
  };
}

function seedDefaultSelections(product: LocalMenuProduct): SelectedVariation[] {
  const seeded: SelectedVariation[] = [];
  for (const group of product.variationGroups) {
    if (group.type === "single" && group.required && group.options[0]) {
      seeded.push(toSelectedVariation(group, group.options[0]));
    }
  }
  return seeded;
}

type PublicMenuClientProps = {
  slug: string;
  businessName: string;
  businessLogoUrl: string;
  businessCoverImageUrl: string;
  publicDescription: string;
  googleMapsUrl: string;
  googleReviewsUrl?: string;
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
  /** Kasa POS — /api/kasa/orders */
  cashierMode?: boolean;
  cashierFulfillment?: FulfillmentType;
  onCashierOrderPlaced?: (result: { orderId: string; orderCode: string }) => void;
  /** Staff: daha sade menü kabuğu */
  compactChrome?: boolean;
  initialMenu: LocalMenuState;
  /** Sunucu oturumu — API gecikmeden / cookie domain hatasında bile doğru kimlik */
  initialCustomerSession?: {
    kind: "guest" | "customer" | "restaurant" | "unknown";
    firstName: string;
    lastName?: string;
    email: string | null;
  };
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
  googleReviewsUrl = "",
  hoursPair,
  initialOpenStatus,
  initialClosedMessage,
  paymentFlags,
  fulfillmentFlags,
  orderSource = "qr_menu",
  tableNumber,
  waiterMode = false,
  cashierMode = false,
  cashierFulfillment,
  onCashierOrderPlaced,
  compactChrome = false,
  initialMenu,
  initialCustomerSession,
}: PublicMenuClientProps) {
  const { locale, t } = useMenuT();
  const slug = rawSlug.toLowerCase();
  const isTableMenu = tableNumber != null && tableNumber > 0;
  const staffChrome = waiterMode || cashierMode || compactChrome;
  const [menu] = useState<LocalMenuState>(initialMenu);
  const [title] = useState<string>(businessName);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [restaurantFav, setRestaurantFav] = useState(false);
  const [customerKind, setCustomerKind] = useState<"guest" | "customer" | "restaurant" | "unknown">(
    () => initialCustomerSession?.kind ?? "guest",
  );
  const [customerFirstName, setCustomerFirstName] = useState(
    () => initialCustomerSession?.firstName ?? "",
  );
  const [customerLastName, setCustomerLastName] = useState(
    () => initialCustomerSession?.lastName ?? "",
  );
  const [customerEmail, setCustomerEmail] = useState<string | null>(
    () => initialCustomerSession?.email ?? null,
  );
  const [cart, setCart] = useState<CartState>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [customizeProduct, setCustomizeProduct] = useState<LocalMenuProduct | null>(null);
  const [removedIngredientsDraft, setRemovedIngredientsDraft] = useState<string[]>([]);
  const [selectedOptionsDraft, setSelectedOptionsDraft] = useState<SelectedVariation[]>([]);
  const [previewProduct, setPreviewProduct] = useState<LocalMenuProduct | null>(null);
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getClientOnlineStatus, () => true);
  const pwaInstall = usePublicMenuPwaInstall();
  const [restaurantPwaHost, setRestaurantPwaHost] = useState(false);
  useEffect(() => {
    setRestaurantPwaHost(isRestaurantMenuPwaHost(window.location.host));
  }, []);

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

  useEffect(() => {
    if (staffChrome) return;
    setRestaurantFav(isRestaurantFavorited(slug));
    const next = new Set<string>();
    for (const p of menu.products) {
      if (isProductFavorited(slug, p.id)) next.add(p.id);
    }
    setFavorites(next);

    void (async () => {
      try {
        const res = await fetch("/api/musteri/checkout-context", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          kind?: string;
          firstName?: string;
          lastName?: string;
          email?: string;
        };
        if (res.ok && data.ok && data.kind === "customer") {
          setCustomerKind("customer");
          setCustomerFirstName(data.firstName ?? "");
          setCustomerLastName(data.lastName ?? "");
          setCustomerEmail(data.email ?? null);
          const favRes = await fetch("/api/musteri/favorites", {
            credentials: "include",
            cache: "no-store",
          });
          const favData = (await favRes.json()) as {
            ok?: boolean;
            items?: { kind: string; subdomain: string; productId: string | null }[];
          };
          if (favRes.ok && favData.ok && favData.items) {
            const productSet = new Set<string>();
            let rest = false;
            for (const item of favData.items) {
              if (item.subdomain !== slug) continue;
              if (item.kind === "restaurant") rest = true;
              if (item.kind === "product" && item.productId) productSet.add(item.productId);
            }
            setRestaurantFav(rest);
            setFavorites(productSet);
          }
        } else if (res.ok && data.ok && (data.kind === "restaurant" || data.kind === "unknown")) {
          setCustomerKind(data.kind);
        }
      } catch {
        /* misafir */
      }
    })();
  }, [slug, menu.products, staffChrome]);

  useEffect(() => {
    if (staffChrome || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tekrar = params.get("tekrar");
    if (!tekrar) return;
    const ids = tekrar.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setCart((prev) => {
      const next = { ...prev };
      for (const productId of ids) {
        const product = menu.products.find((p) => p.id === productId && !p.hidden);
        if (!product) continue;
        const key = buildCartKey(productId, [], []);
        next[key] = {
          productId,
          qty: (next[key]?.qty ?? 0) + 1,
          removedIngredients: [],
          selectedOptions: [],
        };
      }
      return next;
    });
    setCheckoutOpen(true);
  }, [staffChrome, menu.products]);

  useEffect(() => {
    if (staffChrome) {
      setCartHydrated(true);
      return;
    }
    const stored = getMarketplaceCart();
    if (!stored || stored.subdomain !== slug) {
      setCartHydrated(true);
      return;
    }
    if (stored.detail && Object.keys(stored.detail).length > 0) {
      const next: CartState = {};
      for (const [key, entry] of Object.entries(stored.detail)) {
        next[key] = {
          productId: entry.productId,
          qty: entry.qty,
          removedIngredients: entry.removedIngredients ?? [],
          selectedOptions: (entry.selectedOptions ?? []).map((o) => ({
            groupId: o.groupId,
            groupName: o.groupName,
            optionId: o.optionId,
            optionLabel: o.optionLabel,
            priceDelta: Number(o.priceDelta) || 0,
          })),
        };
      }
      setCart(next);
      setCartHydrated(true);
      return;
    }
    const next: CartState = {};
    for (const line of stored.lines) {
      const key = buildCartKey(line.productId, [], []);
      next[key] = {
        productId: line.productId,
        qty: line.qty,
        removedIngredients: [],
        selectedOptions: [],
      };
    }
    setCart(next);
    setCartHydrated(true);
  }, [staffChrome, slug]);

  const openStatus = useMemo(() => {
    if (clockTick === 0) return initialOpenStatus;
    if (!hoursPair) return null;
    return isBusinessOpenNow(hoursPair.open, hoursPair.close);
  }, [hoursPair, clockTick, initialOpenStatus]);
  const hoursRangeLabel = useMemo(() => {
    return hoursPair ? getBusinessHoursRangeLabel(hoursPair.open, hoursPair.close) : null;
  }, [hoursPair]);
  const orderingEnabled = openStatus !== false && isOnline;
  const closedMessageTr =
    clockTick > 0 && hoursPair
      ? getBusinessClosedMessage(hoursPair.open, hoursPair.close)
      : initialClosedMessage;
  const closedMessage = !isOnline
    ? t("offline")
    : closedMessageForLocale(locale, hoursPair?.open ?? "", hoursPair?.close ?? "", closedMessageTr);

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

  const cartLines: CartLine[] = useMemo(
    () => buildCartLines(cart, visibleProducts),
    [cart, visibleProducts],
  );

  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce(
    (s, l) => s + getPrimaryMenuDisplayPriceWithVariations(l.product, fulfillmentFlags, l.selectedOptions) * l.qty,
    0,
  );

  useEffect(() => {
    if (staffChrome || !cartHydrated) return;
    const detail: MarketplaceCartDetail = {};
    const lines = cartLines.map((l) => {
      detail[l.key] = {
        productId: l.product.id,
        qty: l.qty,
        removedIngredients: l.removedIngredients,
        selectedOptions: l.selectedOptions,
      };
      return {
        productId: l.product.id,
        name: l.product.name,
        qty: l.qty,
        unitPrice: getPrimaryMenuDisplayPriceWithVariations(l.product, fulfillmentFlags, l.selectedOptions),
      };
    });
    persistMenuCartToMarketplace({
      subdomain: slug,
      restaurantName: title,
      lines,
      detail,
    });
  }, [staffChrome, cartHydrated, cartLines, slug, title, fulfillmentFlags]);

  function addConfiguredProductToCart(
    productId: string,
    removedIngredients: string[] = [],
    selectedOptions: SelectedVariation[] = [],
  ) {
    if (!orderingEnabled) return;
    if (!confirmRestaurantCartSwitch(slug, title)) return;
    const existing = getMarketplaceCart();
    const key = buildCartKey(productId, removedIngredients, selectedOptions);
    if (existing && existing.subdomain !== slug) {
      clearMarketplaceCart();
      setCart({
        [key]: {
          productId,
          qty: 1,
          removedIngredients,
          selectedOptions,
        },
      });
      return;
    }
    setCart((c) => ({
      ...c,
      [key]: {
        productId,
        qty: (c[key]?.qty ?? 0) + 1,
        removedIngredients,
        selectedOptions,
      },
    }));
  }

  function requestAddToCart(product: LocalMenuProduct) {
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    const removableIngredients = parseIngredientLines(product.ingredients);
    if (removableIngredients.length === 0 && !hasVariations(product.variationGroups)) {
      addConfiguredProductToCart(product.id, [], []);
      return;
    }
    setCustomizeProduct(product);
    setRemovedIngredientsDraft([]);
    setSelectedOptionsDraft(seedDefaultSelections(product));
  }

  async function toggleFavorite(id: string) {
    const product = menu.products.find((p) => p.id === id);
    const was = favorites.has(id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (customerKind === "customer") {
      try {
        await fetch("/api/musteri/favorites", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: was ? "remove" : "add",
            kind: "product",
            subdomain: slug,
            productId: id,
            productName: product?.name ?? "",
            restaurantName: title,
          }),
        });
      } catch {
        /* local state already updated */
      }
      return;
    }

    toggleGuestProductFavorite({
      subdomain: slug,
      productId: id,
      productName: product?.name ?? "",
      restaurantName: title,
    });
  }

  async function toggleRestaurantFavorite() {
    const was = restaurantFav;
    setRestaurantFav(!was);
    if (customerKind === "customer") {
      try {
        await fetch("/api/musteri/favorites", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: was ? "remove" : "add",
            kind: "restaurant",
            subdomain: slug,
            restaurantName: title,
          }),
        });
      } catch {
        /* ignore */
      }
      return;
    }
    toggleGuestRestaurantFavorite({ subdomain: slug, restaurantName: title });
  }

  function categoryLabel(c: LocalMenuCategory): string {
    return c.name;
  }

  const customizationIngredients = useMemo(
    () => (customizeProduct ? parseIngredientLines(customizeProduct.ingredients) : []),
    [customizeProduct],
  );

  function selectSingleOption(group: VariationGroup, option: VariationOption) {
    setSelectedOptionsDraft((prev) => [
      ...prev.filter((o) => o.groupId !== group.id),
      toSelectedVariation(group, option),
    ]);
  }

  function toggleMultiOption(group: VariationGroup, option: VariationOption) {
    setSelectedOptionsDraft((prev) => {
      const exists = prev.some((o) => o.groupId === group.id && o.optionId === option.id);
      if (exists) return prev.filter((o) => !(o.groupId === group.id && o.optionId === option.id));
      return [...prev, toSelectedVariation(group, option)];
    });
  }

  function closeCustomize() {
    setCustomizeProduct(null);
    setRemovedIngredientsDraft([]);
    setSelectedOptionsDraft([]);
  }

  function confirmCustomizationAndAdd() {
    if (!customizeProduct) return;
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    const missingRequired = customizeProduct.variationGroups.find(
      (g) => g.required && !selectedOptionsDraft.some((o) => o.groupId === g.id),
    );
    if (missingRequired) {
      window.alert(`Lütfen "${missingRequired.name}" seçimini yapın.`);
      return;
    }
    addConfiguredProductToCart(customizeProduct.id, removedIngredientsDraft, selectedOptionsDraft);
    closeCustomize();
  }

  const activeCategory = effectiveTab !== "all" ? visibleCategories.find((c) => c.id === effectiveTab) : null;
  const sectionHeading = activeCategory?.name ?? t("picksForYou");
  /** Public / masa QR: web'de sol marka + sağ ızgara. Kasa/garson dar mobil kabukta kalır. */
  const desktopSplit = !staffChrome;

  const searchField = (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
        search
      </span>
      <input
        className="w-full rounded-2xl border-none bg-surface-container-low py-4 pl-12 pr-4 font-medium text-on-surface placeholder:text-secondary focus:ring-2 focus:ring-primary/20"
        placeholder={t("searchPlaceholder")}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoComplete="off"
      />
    </div>
  );

  const categoryNav = visibleCategories.length > 0 ? (
    <nav
      className={[
        "z-50 border-b border-surface-container-highest bg-surface-container-lowest/95 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container-lowest/80",
        desktopSplit ? "sticky top-0 lg:static lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none" : "sticky top-0",
      ].join(" ")}
    >
      <div
        className={[
          "flex space-x-6 overflow-x-auto scroll-smooth px-6 py-4",
          desktopSplit ? "lg:px-0 lg:pb-3 lg:pt-0" : "",
        ].join(" ")}
      >
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
          {t("popular")}
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
  ) : null;

  const menuBody = (
    <div
      className={[
        "relative min-h-screen bg-background font-body text-on-background",
        desktopSplit
          ? "mx-auto max-w-md pb-28 lg:max-w-7xl lg:px-6 lg:pb-12 lg:pt-8 lg:pl-60"
          : staffChrome
            ? "mx-auto max-w-md pb-28"
            : "mx-auto max-w-md pb-32",
      ].join(" ")}
    >
      {!staffChrome ? (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-surface-container-highest/80 bg-background/90 px-4 py-2 backdrop-blur">
          <CustomerIdentityChip
            session={{
              kind: customerKind,
              firstName: customerFirstName,
              lastName: customerLastName,
              email: customerEmail,
            }}
            absolute
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleRestaurantFavorite()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-surface-container-highest bg-white"
              aria-label={restaurantFav ? t("unfavRestaurant") : t("favRestaurant")}
            >
              <span
                className={["material-symbols-outlined text-[20px]", restaurantFav ? "text-[#bc000c]" : "text-secondary"].join(" ")}
                style={restaurantFav ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
            </button>
            <CustomerNotificationsPanel enabled={customerKind === "customer"} />
          </div>
        </div>
      ) : null}

      <div
        className={
          desktopSplit
            ? "lg:grid lg:grid-cols-[minmax(280px,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10"
            : undefined
        }
      >
        <header
          className={[
            "bg-surface-container-lowest px-6 pb-6 pt-10",
            desktopSplit
              ? "lg:sticky lg:top-8 lg:self-start lg:overflow-hidden lg:rounded-3xl lg:border lg:border-surface-container-highest lg:px-0 lg:pb-6 lg:pt-0 lg:shadow-sm"
              : "",
          ].join(" ")}
        >
          {businessCoverImageUrl ? (
            <div
              className={[
                "mb-6 overflow-hidden",
                desktopSplit ? "-mx-6 lg:mx-0 lg:mb-0" : "-mx-6",
              ].join(" ")}
            >
              <div className={desktopSplit ? "relative h-44 lg:h-52" : "relative h-44"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={businessCoverImageUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
              </div>
            </div>
          ) : null}
          <div
            className={[
              "mb-6 flex items-start justify-between gap-3",
              desktopSplit ? "lg:mb-0 lg:flex-col lg:px-6 lg:pt-6" : "",
            ].join(" ")}
          >
            <div
              className={[
                "flex min-w-0 flex-1 items-start gap-3",
                desktopSplit ? "lg:flex-col lg:items-stretch lg:gap-4" : "",
              ].join(" ")}
            >
              {businessLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessLogoUrl}
                  alt=""
                  className={[
                    "shrink-0 rounded-2xl border border-surface-container-high bg-white object-contain shadow-sm",
                    desktopSplit ? "h-16 w-16 lg:h-20 lg:w-20" : "h-16 w-16",
                  ].join(" ")}
                />
              ) : null}
              <div className="min-w-0">
                <h1
                  className={[
                    "font-headline font-extrabold tracking-tighter text-primary",
                    desktopSplit ? "text-3xl lg:text-4xl" : "text-3xl",
                  ].join(" ")}
                >
                  {title}
                </h1>
                {isTableMenu && !waiterMode && !cashierMode ? (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                    {t("table")} {tableNumber}
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {openStatus === null ? (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-secondary/40" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
                        {t("noHours")}
                      </span>
                    </>
                  ) : openStatus ? (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                        {t("openNow")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-widest text-amber-800">
                        {t("closedNow")}
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
                  <p
                    className={[
                      "mt-2 text-sm leading-relaxed text-secondary",
                      desktopSplit ? "max-w-xs lg:max-w-none" : "max-w-xs",
                    ].join(" ")}
                  >
                    {publicDescription}
                  </p>
                ) : null}
                {openStatus === false ? (
                  <p
                    className={[
                      "mt-2 text-xs leading-relaxed text-amber-900",
                      desktopSplit ? "max-w-xs lg:max-w-none" : "max-w-xs",
                    ].join(" ")}
                  >
                    {closedMessage}
                  </p>
                ) : null}
              </div>
            </div>
            <QrMenuHeaderActions
              googleMapsUrl={googleMapsUrl}
              googleReviewsUrl={googleReviewsUrl}
              desktopSplit={desktopSplit}
              locale={locale}
              t={t}
              appInstalled={pwaInstall.isInstalled}
              appLabel={pwaInstall.buttonLabel}
              appIcon={pwaInstall.isInstalled ? "check_circle" : pwaInstall.isIos ? "help" : "download"}
              onInstall={() => void pwaInstall.handleInstallClick()}
              showAppInstall={restaurantPwaHost}
            />
          </div>
          <div className={desktopSplit ? "mt-4 lg:hidden" : "relative mt-4"}>{searchField}</div>
        </header>

        <div className={desktopSplit ? "lg:min-w-0" : undefined}>
          {desktopSplit ? <div className="mb-4 hidden px-0 pt-0 lg:block">{searchField}</div> : null}
          {categoryNav}

          <main
            className={[
              "space-y-8 overflow-x-hidden px-6 pt-6",
              desktopSplit ? "lg:px-0 lg:pt-4" : "",
            ].join(" ")}
          >
            {heroProduct ? (
              <section className="grid grid-cols-1 gap-4">
                <div
                  className={[
                    "group relative overflow-hidden rounded-3xl",
                    desktopSplit ? "h-64 lg:h-72" : "h-64",
                  ].join(" ")}
                >
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
                      {t("signature")}
                    </span>
                    <h2
                      className={[
                        "font-headline font-extrabold leading-tight text-white",
                        desktopSplit ? "text-2xl lg:text-3xl" : "text-2xl",
                      ].join(" ")}
                    >
                      {heroProduct.name}
                    </h2>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-white/80 line-clamp-2">
                        {heroProduct.description ||
                          parseIngredientLines(heroProduct.ingredients).slice(0, 2).join(" · ")}
                      </p>
                      <span className="shrink-0 text-xl font-black text-white">
                        {formatTry(getPrimaryMenuDisplayPrice(heroProduct, fulfillmentFlags))}
                      </span>
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
                    ? t("noProducts")
                    : t("noSearch")}
                </p>
              ) : (
                <div
                  className={[
                    "grid grid-cols-2 gap-4",
                    desktopSplit ? "lg:grid-cols-3 lg:gap-5 xl:grid-cols-4" : "",
                  ].join(" ")}
                >
                  {gridProducts.map((p) => (
                    <div
                      key={p.id}
                      id={`urun-${p.id}`}
                      className="group scroll-mt-28 rounded-3xl bg-surface-container-lowest p-3 transition-transform duration-200 active:scale-95"
                    >
                      <div
                        className={[
                          "relative mb-3 overflow-hidden rounded-2xl",
                          desktopSplit ? "h-40 lg:h-44" : "h-40",
                        ].join(" ")}
                      >
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
                          aria-label={favorites.has(p.id) ? t("removeFavorite") : t("addFavorite")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewProduct(null);
                            toggleFavorite(p.id);
                          }}
                        >
                          <span
                            className={[
                              "material-symbols-outlined text-lg",
                              favorites.has(p.id) ? "text-[#bc000c]" : "text-secondary",
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
                        <span className="font-black text-primary">
                          {formatTry(getPrimaryMenuDisplayPrice(p, fulfillmentFlags))}
                        </span>
                        <button
                          type="button"
                          className={[
                            "rounded-xl p-2 text-white",
                            orderingEnabled
                              ? "bg-primary-container"
                              : "cursor-not-allowed bg-surface-container-high text-secondary",
                          ].join(" ")}
                          aria-label={`Sepete ekle: ${p.name}`}
                          aria-disabled={!orderingEnabled}
                          title={orderingEnabled ? undefined : t("restaurantClosed")}
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
              <section
                className={[
                  "rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm",
                  desktopSplit ? "lg:hidden" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-background">{t("location")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">
                      {t("locationHint")}
                    </p>
                  </div>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-primary/15 bg-primary/8 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/12"
                  >
                    {t("openInMaps")}
                    <span className="material-symbols-outlined text-[16px]">north_east</span>
                  </a>
                </div>
              </section>
            ) : null}
            {!staffChrome && !isTableMenu && restaurantPwaHost ? (
              <div className={desktopSplit ? "lg:hidden" : undefined}>
                <PublicMenuPwaCard businessName={title} controller={pwaInstall} showAction={false} />
              </div>
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
            {staffChrome ? null : (
              <footer className="rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="pointer-events-none origin-left scale-[0.56]">
                      <SiteLogo variant="compact" />
                    </div>
                    <p className="-mt-5 text-sm font-semibold text-on-background">
                      Bu menü KendiSepetim ile oluşturuldu.
                    </p>
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
            )}
          </main>
        </div>
      </div>

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
            aria-label={`${t("cart")}: ${cartCount} ${t("items")}, ${formatTry(cartTotal)}`}
            aria-disabled={!orderingEnabled}
            title={orderingEnabled ? undefined : t("restaurantClosed")}
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="text-sm font-bold">
              {cartCount} {t("items")} — {formatTry(cartTotal)}
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
        cashierMode={cashierMode}
        cashierFulfillment={cashierFulfillment}
        onCashierOrderPlaced={onCashierOrderPlaced}
        subdomain={slug}
        orderingEnabled={orderingEnabled}
        closedMessage={closedMessage}
      />
      {customizeProduct ? (
        <ProductCustomizeModal
          product={customizeProduct}
          removableIngredients={customizationIngredients}
          removedIngredients={removedIngredientsDraft}
          selectedOptions={selectedOptionsDraft}
          basePrice={getPrimaryMenuDisplayPrice(customizeProduct, fulfillmentFlags)}
          onSelectSingle={selectSingleOption}
          onToggleMulti={toggleMultiOption}
          onToggleIngredient={(ingredient) =>
            setRemovedIngredientsDraft((prev) =>
              prev.includes(ingredient) ? prev.filter((x) => x !== ingredient) : [...prev, ingredient],
            )
          }
          onClose={closeCustomize}
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

  if (staffChrome) return menuBody;
  return (
    <CustomerChrome
      session={{
        kind: customerKind,
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
      }}
      variant="overlay"
      absoluteLinks
    >
      {menuBody}
    </CustomerChrome>
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
  const { t } = useMenuT();
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">{t("ingredients")}</h3>
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
            {orderingEnabled ? t("addToCart") : t("restaurantClosed")}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDelta(delta: number): string {
  if (delta === 0) return "";
  const rounded = Math.round(delta);
  return rounded > 0 ? `+${rounded} ₺` : `${rounded} ₺`;
}

function ProductCustomizeModal({
  product,
  removableIngredients,
  removedIngredients,
  selectedOptions,
  basePrice,
  onSelectSingle,
  onToggleMulti,
  onToggleIngredient,
  onClose,
  onConfirm,
  orderingEnabled,
}: {
  product: LocalMenuProduct;
  removableIngredients: string[];
  removedIngredients: string[];
  selectedOptions: SelectedVariation[];
  basePrice: number;
  onSelectSingle: (group: VariationGroup, option: VariationOption) => void;
  onToggleMulti: (group: VariationGroup, option: VariationOption) => void;
  onToggleIngredient: (ingredient: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  orderingEnabled: boolean;
}) {
  const { t } = useMenuT();
  const groups = product.variationGroups;
  const livePrice = basePrice + sumVariationDeltas(selectedOptions);
  const isOptionSelected = (groupId: string, optionId: string) =>
    selectedOptions.some((o) => o.groupId === groupId && o.optionId === optionId);

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
            {groups.length > 0 ? t("customizeHint") : t("removeHint")}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <div key={group.id} className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-headline text-sm font-bold text-on-background">{group.name}</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  {group.type === "single"
                    ? group.required
                      ? t("requiredSingle")
                      : t("single")
                    : t("multi")}
                </span>
              </div>
              <div className="space-y-2">
                {group.options.map((option) => {
                  const checked = isOptionSelected(group.id, option.id);
                  const deltaLabel = formatDelta(option.priceDelta);
                  return (
                    <label
                      key={option.id}
                      className={[
                        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 transition",
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-surface-container-high bg-white",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type={group.type === "single" ? "radio" : "checkbox"}
                          name={`${group.id}`}
                          checked={checked}
                          onChange={() =>
                            group.type === "single"
                              ? onSelectSingle(group, option)
                              : onToggleMulti(group, option)
                          }
                          className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
                        />
                        <span className="text-sm text-on-background">{option.label}</span>
                      </span>
                      {deltaLabel ? (
                        <span className="text-xs font-semibold text-primary">{deltaLabel}</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {removableIngredients.length > 0 ? (
            <div className={groups.length > 0 ? "border-t border-surface-container-high pt-4" : ""}>
              {groups.length > 0 ? (
                <h3 className="mb-2 font-headline text-sm font-bold text-on-background">Malzeme çıkar</h3>
              ) : null}
              <div className="space-y-2">
                {removableIngredients.map((ingredient) => {
                  const removed = removedIngredients.includes(ingredient);
                  return (
                    <label
                      key={ingredient}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition",
                        removed
                          ? "border-primary/30 bg-primary/5"
                          : "border-surface-container-high bg-white",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={removed}
                        onChange={() => onToggleIngredient(ingredient)}
                        className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                      />
                      <span
                        className={[
                          "text-sm transition",
                          removed
                            ? "text-secondary line-through decoration-primary decoration-2"
                            : "text-on-background",
                        ].join(" ")}
                      >
                        {ingredient}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!orderingEnabled}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-lg transition",
              orderingEnabled
                ? "bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white active:scale-[0.98]"
                : "cursor-not-allowed bg-surface-container-high text-secondary shadow-none",
            ].join(" ")}
          >
            {orderingEnabled ? `${t("addToCart")} · ${formatTry(livePrice)}` : t("restaurantClosed")}
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
