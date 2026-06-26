"use client";

import {
  createMenuCategoryAction,
  deleteMenuCategoryAction,
  toggleMenuCategoryHiddenAction,
  toggleMenuProductHiddenAction,
  updateMenuCategoryAction,
  upsertMenuProductAction,
  deleteMenuProductAction,
  type MenuLoadResult,
} from "@/app/dashboard/menu-actions";
import CategoryEditModal, { type CategoryEditFields } from "@/components/dashboard/category-edit-modal";
import ProductFormModal, { type ProductFormFields } from "@/components/dashboard/product-form-modal";
import {
  getDisplayedProductPrice,
  getOrphanProducts,
  getProductsInCategory,
  parseIngredientLines,
  type LocalMenuCategory,
  type LocalMenuProduct,
  type LocalMenuState,
} from "@/lib/local-menu";
import { type FormEvent, useCallback, useEffect, useId, useState, useTransition } from "react";

function formatTry(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

type MenuManagerProps = {
  subdomain: string;
  businessName: string;
};

type ProductModalState =
  | null
  | { type: "create"; categoryId: string }
  | { type: "edit"; product: LocalMenuProduct };

export default function MenuManager({ subdomain, businessName }: MenuManagerProps) {
  const baseId = useId();
  const [state, setState] = useState<LocalMenuState>({ categories: [], products: [] });
  const [hydrated, setHydrated] = useState(false);
  const [productModal, setProductModal] = useState<ProductModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryEditTarget, setCategoryEditTarget] = useState<LocalMenuCategory | null>(null);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/dashboard/menu", {
          credentials: "include",
          cache: "no-store",
        });
        const result = (await res.json()) as MenuLoadResult;
        if (!result.ok) {
          setActionError(result.error);
        } else {
          setState(result.state);
          setActionError(null);
        }
      } catch {
        setActionError("Menü yüklenemedi.");
      }
      setHydrated(true);
    });
  }, [subdomain]);

  useEffect(() => {
    load();
  }, [load]);

  function applyResult(
    promise: Promise<{ ok: true; state: LocalMenuState } | { ok: false; error: string }>,
    opts?: { onSuccess?: () => void },
  ) {
    startTransition(async () => {
      const result = await promise;
      if (!result.ok) {
        setActionError(result.error);
        window.alert(result.error);
        return;
      }
      setState(result.state);
      setActionError(null);
      opts?.onSuccess?.();
    });
  }

  function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    applyResult(createMenuCategoryAction(name), { onSuccess: () => setNewCategoryName("") });
  }

  function handleDeleteCategory(cat: LocalMenuCategory) {
    const n = state.products.filter((p) => p.categoryId === cat.id).length;
    const msg =
      n > 0
        ? `«${cat.name}» kategorisi silinecek. ${n} ürün silinmeyecek; bu ürünler «Kategorisiz ürünler» bölümüne taşınır. Devam edilsin mi?`
        : `«${cat.name}» kategorisini silmek istiyor musunuz?`;
    if (!window.confirm(msg)) return;
    applyResult(deleteMenuCategoryAction(cat.id));
  }

  function toggleCategoryHidden(cat: LocalMenuCategory) {
    if (!cat.hidden) {
      if (!confirm(`«${cat.name}» müşteri menüsünden gizlensin mi?`)) return;
      const inCat = state.products.filter((p) => p.categoryId === cat.id);
      let hideProducts = false;
      if (inCat.length > 0) {
        hideProducts = confirm(
          `Bu kategorideki ${inCat.length} ürün de menüden gizlensin mi? (İsterseniz hayır deyin; sadece kategori gizlenir.)`,
        );
      }
      applyResult(toggleMenuCategoryHiddenAction(cat.id, hideProducts));
    } else {
      if (!confirm(`«${cat.name}» yeniden menüde gösterilsin mi?`)) return;
      applyResult(toggleMenuCategoryHiddenAction(cat.id, false));
    }
  }

  function handleCategoryEditSave(id: string, fields: CategoryEditFields) {
    applyResult(updateMenuCategoryAction(id, fields));
  }

  function toggleProductHidden(p: LocalMenuProduct) {
    applyResult(toggleMenuProductHiddenAction(p.id));
  }

  function handleDeleteProduct(id: string) {
    if (!window.confirm("Bu ürünü silmek istiyor musunuz?")) return;
    applyResult(deleteMenuProductAction(id));
  }

  async function handleProductSave(fields: ProductFormFields, productId?: string) {
    const result = await upsertMenuProductAction(fields, productId);
    if (!result.ok) {
      setActionError(result.error);
      throw new Error(result.error);
    }
    setState(result.state);
    setActionError(null);
    setProductModal(null);
  }

  const orphans = getOrphanProducts(state);

  if (!hydrated) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-secondary">
        Menü yükleniyor…
      </div>
    );
  }

  const modalDefaultCategoryId =
    productModal?.type === "create"
      ? productModal.categoryId
      : productModal?.type === "edit"
        ? productModal.product.categoryId
        : state.categories[0]?.id ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Menü
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          <span className="font-semibold text-on-background">{businessName}</span> için kategoriler ve ürünler.
          Değişiklikler doğrudan hesabınıza bağlı veritabanına kaydedilir.
        </p>
        {actionError ? (
          <p className="mt-3 max-w-2xl rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {actionError}
          </p>
        ) : null}
      </div>

      {/* Yeni kategori — tam genişlik */}
      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
        <h2 className="font-headline text-base font-bold text-on-background">Kategori ekle</h2>
        <form onSubmit={handleAddCategory} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`${baseId}-new-cat`}>
            Yeni kategori adı
          </label>
          <input
            id={`${baseId}-new-cat`}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Örn. Burger"
            className="min-w-0 flex-1 rounded-xl border border-surface-container-highest bg-surface-container-low px-3 py-2.5 text-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-container"
          >
            {isPending ? "Kaydediliyor…" : "Kategori ekle"}
          </button>
        </form>
      </section>

      {/* Kategorisiz ürünler */}
      {orphans.length > 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-tertiary/40 bg-tertiary/5 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-base font-bold text-on-background">Kategorisiz ürünler</h2>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-secondary">
              {orphans.length} ürün
            </span>
          </div>
          <p className="mt-1 text-xs text-secondary">
            Kategorisi silinmiş ürünler burada listelenir. Düzenleyerek yeni bir kategoriye atayabilirsiniz.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
            {orphans.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  onEdit={() => setProductModal({ type: "edit", product: p })}
                  onToggleHidden={() => toggleProductHidden(p)}
                  onDelete={() => handleDeleteProduct(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Kategori kartları — sayfayı kaplar */}
      <div className="space-y-6">
        {state.categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-outline/35 bg-surface-container-low/40 px-4 py-12 text-center text-sm text-secondary">
            Henüz kategori yok. Yukarıdan ilk kategorinizi ekleyin; ardından bu blokta ürün ekleyebilirsiniz.
          </p>
        ) : (
          state.categories.map((cat) => {
            const inCat = getProductsInCategory(state, cat.id);
            return (
              <section
                key={cat.id}
                className={[
                  "rounded-2xl border bg-surface-container-lowest p-5 shadow-sm",
                  cat.hidden ? "border-secondary/30 opacity-95" : "border-surface-container-highest",
                ].join(" ")}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-headline text-xl font-bold text-on-background">«{cat.name}»</h2>
                      {cat.hidden ? (
                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                          Gizli kategori
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-secondary">
                      {inCat.length} ürün · QR sıra: {cat.sortOrder} · Müşteri menüsünde{" "}
                      {cat.hidden ? "görünmez" : "görünür"}
                    </p>
                    {cat.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-secondary">{cat.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryEditTarget(cat)}
                      className="rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
                    >
                      Düzenle
                    </button>
                      <button
                        type="button"
                        onClick={() => toggleCategoryHidden(cat)}
                        className="rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
                      >
                        {cat.hidden ? "Göster" : "Gizle"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="rounded-xl border border-error/30 bg-white px-3 py-2 text-xs font-semibold text-error hover:bg-error/5"
                      >
                        Sil
                      </button>
                    <button
                      type="button"
                      onClick={() => setProductModal({ type: "create", categoryId: cat.id })}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-container"
                    >
                      Ürün ekle
                    </button>
                  </div>
                </div>

                {inCat.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-surface-container-high bg-surface-container-low/40 px-4 py-12 text-center text-sm text-secondary">
                    Bu kategoride henüz ürün yok. «Ürün ekle» ile başlayın.
                  </div>
                ) : (
                  <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                    {inCat.map((p) => (
                      <li key={p.id}>
                        <ProductCard
                          product={p}
                          onEdit={() => setProductModal({ type: "edit", product: p })}
                          onToggleHidden={() => toggleProductHidden(p)}
                          onDelete={() => handleDeleteProduct(p.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>

      <ProductFormModal
        open={productModal !== null}
        onClose={() => setProductModal(null)}
        categories={state.categories}
        mode={productModal?.type === "edit" ? "edit" : "create"}
        defaultCategoryId={modalDefaultCategoryId}
        editingProduct={productModal?.type === "edit" ? productModal.product : null}
        onSave={handleProductSave}
      />

      <CategoryEditModal
        open={categoryEditTarget !== null}
        onClose={() => setCategoryEditTarget(null)}
        category={categoryEditTarget}
        onSave={handleCategoryEditSave}
      />
    </div>
  );
}

function ProductCard({
  product: p,
  onEdit,
  onToggleHidden,
  onDelete,
}: {
  product: LocalMenuProduct;
  onEdit: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const ingLines = parseIngredientLines(p.ingredients);
  const shown = getDisplayedProductPrice(p);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-container">
        {p.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-secondary/60">
            <span className="material-symbols-outlined text-[48px]">restaurant</span>
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-surface-container-high/90 bg-white/95 p-2 text-on-background shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-primary"
            aria-label="Ürünü düzenle"
            title="Düzenle"
          >
            <span className="material-symbols-outlined text-[22px]">edit</span>
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            className="rounded-xl border border-surface-container-high/90 bg-white/95 p-2 text-secondary shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-on-background"
            aria-label={p.hidden ? "Menüde göster" : "Menüde gizle"}
            title={p.hidden ? "Göster" : "Gizle"}
          >
            <span className="material-symbols-outlined text-[22px]">
              {p.hidden ? "visibility" : "visibility_off"}
            </span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-error/25 bg-white/95 p-2 text-error shadow-sm backdrop-blur-sm transition-colors hover:bg-error/10"
            aria-label="Ürünü sil"
            title="Sil"
          >
            <span className="material-symbols-outlined text-[22px]">delete</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="font-headline text-sm font-bold leading-snug text-on-background">{p.name}</h3>
          {p.hidden ? (
            <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
              Gizli
            </span>
          ) : null}
          {p.checkoutUpsell ? (
            <span className="shrink-0 rounded-full bg-tertiary/15 px-2 py-0.5 text-[10px] font-semibold text-tertiary">
              Sepet önerisi
            </span>
          ) : null}
        </div>
        {p.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-secondary">{p.description}</p>
        ) : null}
        {ingLines.length > 0 ? (
          <ul className="mt-2 space-y-0.5 border-l-2 border-primary/25 pl-2.5 text-[11px] leading-snug text-secondary">
            {ingLines.slice(0, 5).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
            {ingLines.length > 5 ? (
              <li className="text-secondary/80">+{ingLines.length - 5} daha…</li>
            ) : null}
          </ul>
        ) : null}
        <div className="mt-auto pt-3">
          <p className="font-mono text-base font-bold text-primary">
            {formatTry(shown)}
            {p.usePackagePrice ? (
              <span className="ml-1.5 text-xs font-medium text-secondary">(paket)</span>
            ) : null}
          </p>
          {p.usePackagePrice ? (
            <p className="mt-0.5 text-[11px] text-secondary">Birim: {formatTry(p.price)}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
