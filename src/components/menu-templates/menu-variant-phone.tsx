"use client";

import { useEffect } from "react";
import { buildGoogleFontsStylesheetUrl, findFontBody, findFontHeading } from "@/lib/theme-font-presets";
import type { MenuFabTheme } from "@/lib/menu-layout";
import { fabTriggerForLayout } from "@/lib/menu-layout";
import { HeroM1, HeroM3, HeroM5, HeroM6, HeroM7, HeroM8, type MenuHeroModel } from "./menu-heroes";
import { MenuVariantM6Web } from "./menu-variant-m6-web";
import { MenuVariantCategories, type MenuVariantCategory } from "./menu-variant-categories";
import { MenuVariantFrame, type MenuFramePresentation } from "./menu-variant-frame";

// Tema ayarlarında kullanılan "compact" önizleme yüksekliğini biraz büyütelim.
// Böylece mobil cihaz hissi korunur ama çerçeve daha dolu görünür.
const COMPACT_VIEWPORT = "max-h-[min(74vh,660px)]";
const FULL_VIEWPORT = "max-h-[min(78vh,720px)]";

export type { MenuVariantCategory };

export type MenuVariantPhoneProps = {
  variant: MenuFabTheme;
  model: MenuHeroModel;
  coverUrl: string | null;
  categories: MenuVariantCategory[];
  fontHeading: string;
  fontBody: string;
  surfaceColor: string;
  brandColor: string;
  accentColor: string;
  fabCallEnabled?: boolean;
  fabCallPhone?: string | null;
  fabWhatsappEnabled?: boolean;
  fabWhatsappPhone?: string | null;
  fabLocationEnabled?: boolean;
  fabLocationLat?: number | null;
  fabLocationLng?: number | null;
  /** Canlı sitede FAB sepet linki */
  cartHref?: string | null;
  cartCount?: number;
  onAddToCart?: (productId: string) => void;
  addToCartLabel?: string;
  /** Tema sayfası: daha kısa telefon yüksekliği */
  compact?: boolean;
  caption?: string | null;
  /** device: önizleme çerçevesi; fullscreen: canlı menü (tam genişlik / tam sayfa) */
  presentation?: MenuFramePresentation;
};

function HeroForVariant({
  variant,
  coverUrl,
  model,
}: {
  variant: MenuFabTheme;
  coverUrl: string | null;
  model: MenuHeroModel;
}) {
  switch (variant) {
    case "m1":
      return <HeroM1 coverUrl={coverUrl} model={model} />;
    case "m3":
      return <HeroM3 coverUrl={coverUrl} model={model} />;
    case "m5":
      return <HeroM5 coverUrl={coverUrl} model={model} />;
    case "m6":
      return <HeroM6 coverUrl={coverUrl} model={model} />;
    case "m7":
      return <HeroM7 coverUrl={coverUrl} model={model} />;
    case "m8":
      return <HeroM8 coverUrl={coverUrl} model={model} />;
    default:
      return null;
  }
}

export function MenuVariantPhone({
  variant,
  model,
  coverUrl,
  categories,
  fontHeading,
  fontBody,
  surfaceColor,
  brandColor,
  accentColor,
  fabCallEnabled,
  fabCallPhone,
  fabWhatsappEnabled,
  fabWhatsappPhone,
  fabLocationEnabled,
  fabLocationLat,
  fabLocationLng,
  cartHref,
  cartCount = 0,
  onAddToCart,
  addToCartLabel,
  compact,
  caption,
  presentation = "device",
}: MenuVariantPhoneProps) {
  const heading = findFontHeading(fontHeading);
  const body = findFontBody(fontBody);

  useEffect(() => {
    const href = buildGoogleFontsStylesheetUrl(fontHeading, fontBody);
    const id = "kendisepetim-menu-variant-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [fontHeading, fontBody]);

  const viewportMaxClass = compact ? COMPACT_VIEWPORT : FULL_VIEWPORT;
  const isFullscreen = presentation === "fullscreen";
  const isM6WebLayout = variant === "m6" && isFullscreen;

  return (
    <div className={isFullscreen ? "w-full" : "mx-auto w-full max-w-[420px]"}>
      {caption && !isFullscreen ? (
        <p className="mb-2 text-center text-xs font-medium text-gray-500">{caption}</p>
      ) : null}
      {caption && isFullscreen ? (
        <p className="sr-only">{caption}</p>
      ) : null}
      <MenuVariantFrame
        fabTheme={variant}
        fabTrigger={fabTriggerForLayout(variant)}
        cartHref={cartHref}
        logoUrl={model.logoUrl}
        fabCallEnabled={fabCallEnabled}
        fabCallPhone={fabCallPhone}
        fabWhatsappEnabled={fabWhatsappEnabled}
        fabWhatsappPhone={fabWhatsappPhone}
        fabLocationEnabled={fabLocationEnabled}
        fabLocationLat={fabLocationLat}
        fabLocationLng={fabLocationLng}
        viewportMaxClass={viewportMaxClass}
        presentation={presentation}
        cartCount={cartCount}
      >
        {isM6WebLayout ? (
          <>
            <div className="hidden lg:block">
              <MenuVariantM6Web
                model={model}
                coverUrl={coverUrl}
                categories={categories}
                headingFamily={heading.cssFamily}
                bodyFamily={body.cssFamily}
                brandColor={brandColor}
                accentColor={accentColor}
                surfaceColor={surfaceColor}
                onAddToCart={onAddToCart}
                addToCartLabel={addToCartLabel}
              />
            </div>
            <div className="lg:hidden">
              <HeroForVariant variant={variant} coverUrl={coverUrl} model={model} />
              <MenuVariantCategories
                variant={variant}
                categories={categories}
                surfaceColor={surfaceColor}
                accentColor={accentColor}
                brandColor={brandColor}
                headingFamily={heading.cssFamily}
                bodyFamily={body.cssFamily}
                onAddToCart={onAddToCart}
                addToCartLabel={addToCartLabel}
              />
            </div>
          </>
        ) : (
          <>
            <HeroForVariant variant={variant} coverUrl={coverUrl} model={model} />
            <MenuVariantCategories
              variant={variant}
              categories={categories}
              surfaceColor={surfaceColor}
              accentColor={accentColor}
              brandColor={brandColor}
              headingFamily={heading.cssFamily}
              bodyFamily={body.cssFamily}
              onAddToCart={onAddToCart}
              addToCartLabel={addToCartLabel}
            />
          </>
        )}
      </MenuVariantFrame>
    </div>
  );
}
