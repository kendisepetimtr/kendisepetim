"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MenuVariantPhone } from "@/components/menu-templates/menu-variant-phone";
import type { MenuFabTheme } from "@/lib/menu-layout";
import { MENU_VARIANT_CARDS } from "@/lib/menu-layout";
import { sampleVariantCategories } from "@/lib/menu-preview-demo-data";
import type { Restaurant } from "../../../../../types";
import { updateRestaurantTheme } from "../../../../../features/tenants/theme-actions";
import { menuThemeFromRestaurant } from "../../../../../lib/tenant-menu-theme";
import { BODY_FONT_OPTIONS, HEADING_FONT_OPTIONS } from "../../../../../lib/theme-font-presets";

type Props = {
  restaurant: Restaurant;
};

function defaultHex(v: string | null, fallback: string): string {
  if (!v) return fallback;
  const s = v.startsWith("#") ? v : `#${v}`;
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
}

export function RestaurantThemeEditor({ restaurant }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const base = useMemo(() => menuThemeFromRestaurant(restaurant), [restaurant]);

  const [brandColor, setBrandColor] = useState(() => defaultHex(restaurant.brand_color, base.brandColor));
  const [accentColor, setAccentColor] = useState(() => defaultHex(restaurant.theme_accent, base.accentColor));
  const [surfaceColor, setSurfaceColor] = useState(() =>
    defaultHex(restaurant.theme_surface, base.surfaceColor),
  );
  const [fontHeading, setFontHeading] = useState(restaurant.font_heading);
  const [fontBody, setFontBody] = useState(restaurant.font_body);
  const [menuLayout, setMenuLayout] = useState<MenuFabTheme>(restaurant.menu_layout);
  const [coverBlobUrl, setCoverBlobUrl] = useState<string | null>(null);

  const demoCategories = useMemo(() => sampleVariantCategories(), []);

  useEffect(() => {
    setBrandColor(defaultHex(restaurant.brand_color, base.brandColor));
    setAccentColor(defaultHex(restaurant.theme_accent, base.accentColor));
    setSurfaceColor(defaultHex(restaurant.theme_surface, base.surfaceColor));
    setFontHeading(restaurant.font_heading);
    setFontBody(restaurant.font_body);
    setMenuLayout(restaurant.menu_layout);
    setCoverBlobUrl(null);
  }, [restaurant, base.brandColor, base.accentColor, base.surfaceColor]);

  useEffect(() => {
    return () => {
      if (coverBlobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(coverBlobUrl);
      }
    };
  }, [coverBlobUrl]);

  const coverPreviewSrc = coverBlobUrl ?? restaurant.cover_url;
  const logoPreviewSrc = restaurant.logo_url;

  const heroModel = useMemo(
    () => ({
      name: restaurant.name,
      slug: restaurant.slug,
      tagline: restaurant.description ?? "Çevrimiçi menü",
      logoUrl: logoPreviewSrc,
    }),
    [restaurant.description, restaurant.name, restaurant.slug, logoPreviewSrc],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("brand_color", brandColor);
    fd.set("theme_accent", accentColor);
    fd.set("theme_surface", surfaceColor);
    fd.set("font_heading", fontHeading);
    fd.set("font_body", fontBody);

    startTransition(async () => {
      try {
        await updateRestaurantTheme(fd);
        if (coverBlobUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(coverBlobUrl);
          setCoverBlobUrl(null);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kayıt başarısız.");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Menü teması</h2>
          <p className="mt-1 text-sm text-gray-600">
            Kapak, renk paleti, yazı tipleri ve menü görünümü. Sağdaki telefon önizlemesi seçtiğiniz şablonu canlı
            gösterir; kaydetmek için alttaki düğmeyi kullanın.
          </p>

          {error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <input type="hidden" name="menu_layout" value={menuLayout} readOnly />

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Menü görünümü</span>
              <p className="mb-3 text-xs text-gray-500">
                Beş hazır şablondan birini seçin; müşteri menünüz bu düzenle listelenir.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {MENU_VARIANT_CARDS.map((card) => {
                  const selected = menuLayout === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setMenuLayout(card.id)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? "border-gray-900 bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-2"
                          : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                      }`}
                    >
                      <span className="font-semibold">
                        {card.shortLabel} · {card.label}
                      </span>
                      <span className={`mt-0.5 block text-xs ${selected ? "text-gray-300" : "text-gray-500"}`}>
                        {card.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Kapak görseli</span>
              <p className="mb-2 text-xs text-gray-500">JPEG, PNG, WebP veya GIF; en fazla 5 MB.</p>
              <input
                name="cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="w-full text-sm text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  setCoverBlobUrl((prev) => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(f);
                  });
                }}
              />
              {restaurant.cover_url ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" name="remove_cover" value="true" />
                  Kayıtlı kapağı kaldır
                </label>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tc-brand">
                  Ana renk
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="tc-brand"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-12 w-20 cursor-pointer rounded-md border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-[11px]"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tc-accent">
                  Vurgu rengi
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="tc-accent"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-12 w-20 cursor-pointer rounded-md border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-[11px]"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tc-surface">
                  Arka plan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="tc-surface"
                    type="color"
                    value={surfaceColor}
                    onChange={(e) => setSurfaceColor(e.target.value)}
                    className="h-12 w-20 cursor-pointer rounded-md border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={surfaceColor}
                    onChange={(e) => setSurfaceColor(e.target.value)}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-[11px]"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tf-head">
                  Başlık yazı tipi
                </label>
                <select
                  id="tf-head"
                  value={fontHeading}
                  onChange={(e) => setFontHeading(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {HEADING_FONT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tf-body">
                  Metin yazı tipi
                </label>
                <select
                  id="tf-body"
                  value={fontBody}
                  onChange={(e) => setFontBody(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {BODY_FONT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {pending ? "Kaydediliyor…" : "Temayı kaydet"}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:sticky lg:top-4">
        <MenuVariantPhone
          variant={menuLayout}
          model={heroModel}
          coverUrl={coverPreviewSrc}
          categories={demoCategories}
          fontHeading={fontHeading}
          fontBody={fontBody}
          surfaceColor={surfaceColor}
          brandColor={brandColor}
          accentColor={accentColor}
          compact
          caption="Canlı önizleme"
        />
      </div>
    </div>
  );
}
