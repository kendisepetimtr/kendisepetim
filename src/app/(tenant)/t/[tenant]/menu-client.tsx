"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MenuVariantPhone } from "@/components/menu-templates/menu-variant-phone";
import type { MenuVariantCategory } from "@/components/menu-templates/menu-variant-categories";
import { formatTry, useTenantCart } from "../../../../features/menu";
import { effectiveOnlinePrice, type Category, type Product } from "../../../../types";
import type { TenantMenuTheme } from "../../../../lib/tenant-menu-theme";

type TenantMenuClientProps = {
  tenantSlug: string;
  categories: Category[];
  products: Product[];
  menuTheme: TenantMenuTheme;
};

function buildVariantCategories(
  categoriesWithProducts: Category[],
  productsByCategory: Record<string, Product[]>,
): MenuVariantCategory[] {
  return categoriesWithProducts.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: (productsByCategory[cat.id] ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      priceLabel: formatTry(effectiveOnlinePrice(p)),
      ingredients: p.ingredients ?? [],
      imageUrl: p.image_url,
    })),
  }));
}

function ProductCustomizeModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (payload: {
    removedIngredients: string[];
    addedIngredients: string[];
    itemNote: string;
  }) => void;
}) {
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedText, setAddedText] = useState("");
  const [addedIngredients, setAddedIngredients] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState("");

  const ingredients = product.ingredients ?? [];

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl rounded-t-2xl bg-white p-4 shadow-2xl">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-600">{formatTry(effectiveOnlinePrice(product))}</p>
          </div>
          <button type="button" className="text-sm text-gray-500" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <section>
            <p className="text-sm font-medium text-gray-800">Malzeme çıkar</p>
            {ingredients.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">Bu ürün için malzeme listesi yok.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {ingredients.map((ingredient) => {
                  const checked = removedIngredients.includes(ingredient);
                  return (
                    <label key={ingredient} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setRemovedIngredients((prev) =>
                            checked ? prev.filter((v) => v !== ingredient) : [...prev, ingredient],
                          )
                        }
                      />
                      {ingredient}
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="text-sm font-medium text-gray-800">Eklemek istediğin malzeme</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={addedText}
                onChange={(e) => setAddedText(e.target.value)}
                placeholder="Örn: ekstra cheddar"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                onClick={() => {
                  const value = addedText.trim();
                  if (!value) return;
                  setAddedIngredients((prev) => (prev.includes(value) ? prev : [...prev, value]));
                  setAddedText("");
                }}
              >
                Ekle
              </button>
            </div>
            {addedIngredients.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {addedIngredients.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                    onClick={() => setAddedIngredients((prev) => prev.filter((v) => v !== item))}
                  >
                    {item} x
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-800" htmlFor="item_note">
              Sipariş notu
            </label>
            <textarea
              id="item_note"
              rows={3}
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Örn: az pişmiş olsun"
            />
          </section>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => onConfirm({ removedIngredients, addedIngredients, itemNote })}
        >
          Tamam ve Sepete Ekle
        </button>
      </div>
    </div>
  );
}

export function TenantMenuClient({
  tenantSlug,
  categories,
  products,
  menuTheme,
}: TenantMenuClientProps) {
  const { addToCart, totalQuantity } = useTenantCart(tenantSlug);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const productsByCategory = useMemo(() => {
    const map = products.reduce<Record<string, Product[]>>((acc, product) => {
      if (!acc[product.category_id]) {
        acc[product.category_id] = [];
      }
      acc[product.category_id]!.push(product);
      return acc;
    }, {});
    for (const key of Object.keys(map)) {
      map[key]!.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return map;
  }, [products]);

  const activeCategories = useMemo(() => {
    return [...categories]
      .filter((category) => category.is_active)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [categories]);

  const categoriesWithProducts = useMemo(() => {
    return activeCategories.filter((c) => (productsByCategory[c.id] ?? []).length > 0);
  }, [activeCategories, productsByCategory]);

  const variantCategories = useMemo(
    () => buildVariantCategories(categoriesWithProducts, productsByCategory),
    [categoriesWithProducts, productsByCategory],
  );

  const heroModel = useMemo(
    () => ({
      name: menuTheme.restaurantName,
      slug: menuTheme.restaurantSlug,
      tagline: menuTheme.restaurantDescription ?? "Çevrimiçi menü",
      logoUrl: menuTheme.logoUrl,
    }),
    [menuTheme.restaurantDescription, menuTheme.restaurantName, menuTheme.restaurantSlug, menuTheme.logoUrl],
  );

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ backgroundColor: menuTheme.surfaceColor }}
    >
      <MenuVariantPhone
        variant={menuTheme.menuLayout}
        model={heroModel}
        coverUrl={menuTheme.coverUrl}
        categories={variantCategories}
        fontHeading={menuTheme.fontHeading}
        fontBody={menuTheme.fontBody}
        surfaceColor={menuTheme.surfaceColor}
        brandColor={menuTheme.brandColor}
        accentColor={menuTheme.accentColor}
        cartHref={`/t/${tenantSlug}/cart`}
        cartCount={totalQuantity}
        onAddToCart={(id) => {
          const p = products.find((x) => x.id === id);
          if (p) setSelectedProduct(p);
        }}
        addToCartLabel="Sepete ekle"
        caption={null}
        presentation="fullscreen"
        fabCallEnabled={menuTheme.fabCallEnabled}
        fabCallPhone={menuTheme.fabCallPhone}
        fabWhatsappEnabled={menuTheme.fabWhatsappEnabled}
        fabWhatsappPhone={menuTheme.fabWhatsappPhone}
        fabLocationEnabled={menuTheme.fabLocationEnabled}
        fabLocationLat={menuTheme.fabLocationLat}
        fabLocationLng={menuTheme.fabLocationLng}
      />

      <footer className="mt-auto w-full px-4 py-6 text-center text-sm text-gray-600">
        Bu dijital menü{" "}
        <Link
          href="https://kendisepetim.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
          style={{ color: menuTheme.accentColor }}
        >
          KendiSepetim.com
        </Link>{" "}
        altyapısıyla hazırlanmıştır.
      </footer>

      {selectedProduct ? (
        <ProductCustomizeModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={({ removedIngredients, addedIngredients, itemNote }) => {
            addToCart(selectedProduct, { removedIngredients, addedIngredients, itemNote });
            setSelectedProduct(null);
          }}
        />
      ) : null}
    </div>
  );
}
