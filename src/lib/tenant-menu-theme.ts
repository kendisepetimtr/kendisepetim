import type { MenuFabTheme } from "./menu-layout";
import type { Restaurant } from "../types";

export type TenantMenuTheme = {
  brandColor: string;
  accentColor: string;
  surfaceColor: string;
  fontHeading: string;
  fontBody: string;
  coverUrl: string | null;
  logoUrl: string | null;
  menuLayout: MenuFabTheme;
  restaurantName: string;
  restaurantDescription: string | null;
  restaurantSlug: string;
  fabCallEnabled: boolean;
  fabCallPhone: string | null;
  fabWhatsappEnabled: boolean;
  fabWhatsappPhone: string | null;
  fabLocationEnabled: boolean;
  fabLocationLat: number | null;
  fabLocationLng: number | null;
};

export function menuThemeFromRestaurant(r: Restaurant): TenantMenuTheme {
  return {
    brandColor: r.brand_color ?? "#111827",
    accentColor: r.theme_accent ?? "#ea580c",
    surfaceColor: r.theme_surface ?? "#ffffff",
    fontHeading: r.font_heading ?? "inter",
    fontBody: r.font_body ?? "inter",
    coverUrl: r.cover_url ?? null,
    logoUrl: r.logo_url ?? null,
    menuLayout: r.menu_layout,
    restaurantName: r.name,
    restaurantDescription: r.description ?? null,
    restaurantSlug: r.slug,
    fabCallEnabled: r.fab_call_enabled ?? false,
    fabCallPhone: r.fab_call_phone ?? null,
    fabWhatsappEnabled: r.fab_whatsapp_enabled ?? false,
    fabWhatsappPhone: r.fab_whatsapp_phone ?? null,
    fabLocationEnabled: r.fab_location_enabled ?? false,
    fabLocationLat: r.fab_location_lat ?? null,
    fabLocationLng: r.fab_location_lng ?? null,
  };
}
