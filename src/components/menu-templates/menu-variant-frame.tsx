import type { ReactNode } from "react";
import type { MenuFabTheme, MenuFabTriggerMode } from "@/lib/menu-layout";
import { MenuPreviewFab } from "./menu-fab";

const DEFAULT_VIEWPORT = "max-h-[min(78vh,720px)]";

export type MenuFramePresentation = "device" | "fullscreen";

export function MenuVariantFrame({
  children,
  className = "",
  fabTheme,
  fabTrigger = "logo",
  cartHref,
  logoUrl,
  fabCallEnabled,
  fabCallPhone,
  fabWhatsappEnabled,
  fabWhatsappPhone,
  fabLocationEnabled,
  fabLocationLat,
  fabLocationLng,
  viewportMaxClass = DEFAULT_VIEWPORT,
  presentation = "device",
  cartCount = 0,
}: {
  children: ReactNode;
  className?: string;
  fabTheme: MenuFabTheme;
  fabTrigger?: MenuFabTriggerMode;
  cartHref?: string | null;
  logoUrl?: string | null;
  fabCallEnabled?: boolean;
  fabCallPhone?: string | null;
  fabWhatsappEnabled?: boolean;
  fabWhatsappPhone?: string | null;
  fabLocationEnabled?: boolean;
  fabLocationLat?: number | null;
  fabLocationLng?: number | null;
  /** Örn. tema editörü: max-h-[min(64vh,520px)] — yalnızca presentation="device" */
  viewportMaxClass?: string;
  /** device: telefon çerçevesi; fullscreen: kenardan kenara canlı menü */
  presentation?: MenuFramePresentation;
  cartCount?: number;
}) {
  if (presentation === "fullscreen") {
    return (
      <div className={`w-full ${className}`}>
        <div className="relative w-full pb-32">{children}</div>
        <MenuPreviewFab
          theme={fabTheme}
          trigger={fabTrigger}
          cartHref={cartHref}
          logoUrl={logoUrl}
          fabCallEnabled={fabCallEnabled}
          fabCallPhone={fabCallPhone}
          fabWhatsappEnabled={fabWhatsappEnabled}
          fabWhatsappPhone={fabWhatsappPhone}
          fabLocationEnabled={fabLocationEnabled}
          fabLocationLat={fabLocationLat}
          fabLocationLng={fabLocationLng}
          fixedToViewport
          cartCount={cartCount}
        />
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-[420px] overflow-hidden rounded-[2rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl ${className}`}
    >
      <div className={`relative ${viewportMaxClass}`}>
        <div className={`${viewportMaxClass} overflow-y-auto overscroll-contain pb-28`}>{children}</div>
        <MenuPreviewFab
          theme={fabTheme}
          trigger={fabTrigger}
          cartHref={cartHref}
          logoUrl={logoUrl}
          fabCallEnabled={fabCallEnabled}
          fabCallPhone={fabCallPhone}
          fabWhatsappEnabled={fabWhatsappEnabled}
          fabWhatsappPhone={fabWhatsappPhone}
          fabLocationEnabled={fabLocationEnabled}
          fabLocationLat={fabLocationLat}
          fabLocationLng={fabLocationLng}
          cartCount={cartCount}
        />
      </div>
    </div>
  );
}
