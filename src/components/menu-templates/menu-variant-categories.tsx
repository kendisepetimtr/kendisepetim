import { useEffect, useState } from "react";
import type { MenuFabTheme } from "@/lib/menu-layout";

export type MenuVariantCategory = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    description: string;
    priceLabel: string;
    ingredients: string[];
    imageUrl?: string | null;
  }[];
};

type Props = {
  variant: MenuFabTheme;
  categories: MenuVariantCategory[];
  surfaceColor: string;
  accentColor: string;
  brandColor: string;
  headingFamily: string;
  bodyFamily: string;
  onAddToCart?: (productId: string) => void;
  addToCartLabel?: string;
};

function EmptyState({ variant, bodyFamily }: { variant: MenuFabTheme; bodyFamily: string }) {
  const base = "rounded-lg border border-dashed px-4 py-8 text-center text-sm";
  if (variant === "m3") {
    return (
      <div className={`${base} border-stone-600 bg-stone-800/30 text-stone-400`} style={{ fontFamily: bodyFamily }}>
        Henüz listelenecek ürün yok.
      </div>
    );
  }
  if (variant === "m8") {
    return (
      <div className={`${base} border-amber-900/20 bg-white/50 text-amber-900/70`} style={{ fontFamily: bodyFamily }}>
        Henüz listelenecek ürün yok.
      </div>
    );
  }
  if (variant === "m6") {
    return (
      <div className={`${base} border-blue-200 bg-blue-50/60 text-blue-900/70`} style={{ fontFamily: bodyFamily }}>
        Henüz listelenecek ürün yok.
      </div>
    );
  }
  return (
    <div className={`${base} border-gray-300 bg-white text-gray-600`} style={{ fontFamily: bodyFamily }}>
      Henüz listelenecek ürün yok.
    </div>
  );
}

export function MenuVariantCategories({
  variant,
  categories,
  surfaceColor,
  accentColor,
  brandColor,
  headingFamily,
  bodyFamily,
  onAddToCart,
  addToCartLabel = "Sepete",
}: Props) {
  const empty = categories.length === 0 || categories.every((c) => c.items.length === 0);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => categories[0]?.id ?? "");

  useEffect(() => {
    if (!activeCategoryId) {
      setActiveCategoryId(categories[0]?.id ?? "");
      return;
    }
    const stillExists = categories.some((c) => c.id === activeCategoryId);
    if (!stillExists) setActiveCategoryId(categories[0]?.id ?? "");
  }, [activeCategoryId, categories]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  const activeItems = activeCategory?.items ?? [];

  const addBtn = (productId: string) =>
    onAddToCart ? (
      <button
        type="button"
        onClick={() => onAddToCart(productId)}
        className="mt-1 rounded-md px-2 py-1 text-xs font-medium text-white"
        style={{ backgroundColor: accentColor }}
      >
        {addToCartLabel}
      </button>
    ) : (
      <span className="mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium text-white opacity-90" style={{ backgroundColor: accentColor }}>
        {addToCartLabel}
      </span>
    );

  if (empty) {
    return <EmptyState variant={variant} bodyFamily={bodyFamily} />;
  }

  switch (variant) {
    case "m1":
      return (
        <div className="bg-white px-0 pb-8" style={{ fontFamily: bodyFamily }}>
          {categories.map((cat) => (
            <div key={cat.id} className="mt-8 px-5">
              <h2
                className="border-b border-gray-200 pb-2 text-center text-lg text-gray-800"
                style={{ fontFamily: headingFamily, color: brandColor }}
              >
                {cat.name}
              </h2>
              <ul className="mt-4 space-y-5">
                {cat.items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-b border-gray-100 pb-4 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums text-gray-900">{item.priceLabel}</p>
                      {addBtn(item.id)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case "m3":
      return (
        <div className="bg-gradient-to-b from-stone-900 to-neutral-950 pb-10 text-stone-100" style={{ fontFamily: bodyFamily }}>
          <div className="px-4 pt-6">
            {categories.map((cat) => (
              <div key={cat.id} className="mt-8">
                <h2
                  className="border-l-2 pl-3 text-sm font-semibold uppercase tracking-widest"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {cat.name}
                </h2>
                <ul className="mt-4 space-y-3">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-stone-700/80 bg-stone-800/40 px-4 py-3 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-stone-100">{item.name}</p>
                          <p className="mt-0.5 text-xs text-stone-500">{item.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
                            {item.priceLabel}
                          </p>
                          {addBtn(item.id)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case "m5":
      return (
        <div className="bg-white px-0 pb-8 pt-0" style={{ fontFamily: bodyFamily }}>
          {categories.map((cat, idx) => (
            <div key={cat.id} className={idx > 0 ? "mt-2" : "mt-4"}>
              <div className="flex items-end justify-between px-5 pt-8">
                <h2
                  className="max-w-[280px] text-3xl font-black uppercase leading-[0.95] tracking-tighter text-gray-900"
                  style={{ fontFamily: headingFamily }}
                >
                  {cat.name}
                </h2>
                <span className="shrink-0 font-mono text-xs text-gray-400">0{idx + 1}</span>
              </div>
              <div className="mt-4 space-y-0 divide-y divide-gray-200 px-5">
                {cat.items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-gray-100 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-200" title="Ürün fotoğrafı" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-tight text-gray-900">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                      <p className="mt-2 font-mono text-base tabular-nums text-gray-900">{item.priceLabel}</p>
                      {addBtn(item.id)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "m7":
      return (
        <div className="bg-white pb-8" style={{ fontFamily: bodyFamily }}>
          <div className="mx-auto max-w-sm px-5">
            {categories.map((cat) => (
              <div key={cat.id} className="mt-10 first:mt-6">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400"
                  style={{ color: `${brandColor}99` }}
                >
                  {cat.name}
                </p>
                <div className="mt-4 space-y-6">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-baseline justify-between gap-4 border-b border-gray-100 pb-4"
                    >
                      <div>
                        <p className="text-base font-medium text-gray-900">{item.name}</p>
                        <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                        {addBtn(item.id)}
                      </div>
                      <p className="shrink-0 tabular-nums text-gray-900">{item.priceLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "m8":
      return (
        <div className="bg-[#f6f0e8] pb-10" style={{ fontFamily: bodyFamily }}>
          <div className="px-4 pt-10">
            {categories.map((cat) => (
              <div key={cat.id} className="mt-8 first:mt-2">
                <h2 className="font-serif text-lg font-semibold text-amber-950" style={{ fontFamily: headingFamily }}>
                  {cat.name}
                </h2>
                <ul className="mt-3 space-y-3">
                  {cat.items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-amber-900/10 bg-white/60 px-3 py-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-medium text-amber-950">{item.name}</p>
                          <p className="text-sm text-amber-900/60">{item.description}</p>
                          {addBtn(item.id)}
                        </div>
                        <p className="shrink-0 font-medium tabular-nums text-amber-900">{item.priceLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case "m6":
      return (
        <div className="pb-10" style={{ fontFamily: bodyFamily, backgroundColor: surfaceColor }}>
          <div className="sticky top-0 z-10" style={{ backgroundColor: surfaceColor }}>
            <div
              className="flex gap-3 overflow-x-auto border-b border-[#e5e7eb] px-6 py-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {categories.map((cat) => {
                const selected = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className="rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: selected ? brandColor : "#f3f4f6",
                      color: selected ? "#ffffff" : "#6b7280",
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 pt-4">
            {activeItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b border-[#f3f4f6] py-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p
                      className="mt-1 text-sm text-[#6b7280]"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: brandColor }}>
                    {item.priceLabel}
                  </p>
                  {addBtn(item.id)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
