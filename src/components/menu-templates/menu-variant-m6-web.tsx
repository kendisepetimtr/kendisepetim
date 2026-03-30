"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "./brand-mark";
import type { MenuHeroModel } from "./menu-heroes";
import type { MenuVariantCategory } from "./menu-variant-categories";

type Props = {
  model: MenuHeroModel;
  coverUrl: string | null;
  categories: MenuVariantCategory[];
  headingFamily: string;
  bodyFamily: string;
  brandColor: string;
  accentColor: string;
  surfaceColor: string;
  onAddToCart?: (productId: string) => void;
  addToCartLabel?: string;
};

export function MenuVariantM6Web({
  model,
  coverUrl,
  categories,
  headingFamily,
  bodyFamily,
  brandColor,
  accentColor,
  surfaceColor,
  onAddToCart,
  addToCartLabel = "Sepete",
}: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => categories[0]?.id ?? "");

  useEffect(() => {
    if (!activeCategoryId) {
      setActiveCategoryId(categories[0]?.id ?? "");
      return;
    }
    const exists = categories.some((c) => c.id === activeCategoryId);
    if (!exists) setActiveCategoryId(categories[0]?.id ?? "");
  }, [activeCategoryId, categories]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? categories[0],
    [activeCategoryId, categories],
  );
  const items = activeCategory?.items ?? [];
  const hasAnyItems = categories.some((c) => c.items.length > 0);

  return (
    <div style={{ backgroundColor: surfaceColor, fontFamily: bodyFamily }}>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6">
        <aside className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:mb-0 lg:h-fit">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <BrandMark theme="m6" size="fab" logoUrl={model.logoUrl} fallbackLetter={model.name} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-900" style={{ fontFamily: headingFamily }}>
                {model.name}
              </p>
              <p className="truncate text-xs text-gray-500">{model.tagline}</p>
            </div>
          </div>

          <div className="pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Menü</p>
            <div className="space-y-2">
              {categories.map((cat) => {
                const selected = cat.id === activeCategory?.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: selected ? brandColor : "#f3f4f6",
                      color: selected ? "#ffffff" : "#374151",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="relative h-[180px] w-full sm:h-[220px] lg:h-[250px]">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 text-sm text-gray-500">
                  Kapak görseli yok
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/80">OneQR Menü</p>
                <h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: headingFamily }}>
                  {activeCategory?.name ?? "Kategori"}
                </h2>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {!hasAnyItems ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
                Henüz listelenecek ürün yok.
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-600">
                Bu kategoride ürün bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="h-36 w-full bg-gray-100">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">Görsel yok</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                      <p
                        className="mt-1 text-sm text-gray-500"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                        }}
                      >
                        {item.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums" style={{ color: brandColor }}>
                          {item.priceLabel}
                        </span>
                        {onAddToCart ? (
                          <button
                            type="button"
                            onClick={() => onAddToCart(item.id)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {addToCartLabel}
                          </button>
                        ) : (
                          <span
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {addToCartLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
