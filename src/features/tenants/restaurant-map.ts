import { MENU_LAYOUT_DEFAULT, isMenuFabTheme } from "../../lib/menu-layout";
import { buildRestaurantCoversPublicUrl, buildRestaurantLogosPublicUrl } from "../../lib/supabase/storage-public-url";
import type { Restaurant } from "../../types";

export type RestaurantRow = {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  waiter_pin?: string | null;
  table_count?: number | null;
  admin_username?: string | null;
  admin_email?: string | null;
  admin_phone?: string | null;
  logo_url: string | null;
  logo_storage_path?: string | null;
  cover_storage_path?: string | null;
  brand_color: string | null;
  theme_accent?: string | null;
  theme_surface?: string | null;
  font_heading?: string | null;
  font_body?: string | null;
  menu_layout?: string | null;
  fab_call_enabled?: boolean | null;
  fab_call_phone?: string | null;
  fab_whatsapp_enabled?: boolean | null;
  fab_whatsapp_phone?: string | null;
  fab_location_enabled?: boolean | null;
  fab_location_lat?: number | null;
  fab_location_lng?: number | null;
  is_active: boolean;
  created_at: string;
  business_day_opens_at?: string | null;
  business_day_closes_at?: string | null;
  orders_date_basis?: string | null;
  enable_table_orders?: boolean | null;
  enable_package_orders?: boolean | null;
};

export function mapRestaurantFromDb(row: RestaurantRow): Restaurant {
  const logoPath = row.logo_storage_path ?? null;
  const coverPath = row.cover_storage_path ?? null;
  const layoutRaw = row.menu_layout?.trim() ?? "";
  const menu_layout = isMenuFabTheme(layoutRaw) ? layoutRaw : MENU_LAYOUT_DEFAULT;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    slug: row.slug,
    waiter_pin: row.waiter_pin ?? null,
    table_count: row.table_count ?? null,
    admin_username: row.admin_username ?? null,
    admin_email: row.admin_email ?? null,
    admin_phone: row.admin_phone ?? null,
    logo_storage_path: logoPath,
    logo_url: logoPath ? buildRestaurantLogosPublicUrl(logoPath) : row.logo_url,
    cover_storage_path: coverPath,
    cover_url: coverPath ? buildRestaurantCoversPublicUrl(coverPath) : null,
    brand_color: row.brand_color,
    theme_accent: row.theme_accent ?? null,
    theme_surface: row.theme_surface ?? null,
    font_heading: row.font_heading ?? "inter",
    font_body: row.font_body ?? "inter",
    menu_layout,
    fab_call_enabled: row.fab_call_enabled ?? false,
    fab_call_phone: row.fab_call_phone ?? null,
    fab_whatsapp_enabled: row.fab_whatsapp_enabled ?? false,
    fab_whatsapp_phone: row.fab_whatsapp_phone ?? null,
    fab_location_enabled: row.fab_location_enabled ?? false,
    fab_location_lat: row.fab_location_lat ?? null,
    fab_location_lng: row.fab_location_lng ?? null,
    is_active: row.is_active,
    created_at: row.created_at,
    business_day_opens_at: row.business_day_opens_at ?? null,
    business_day_closes_at: row.business_day_closes_at ?? null,
    orders_date_basis:
      row.orders_date_basis === "business_day" ? "business_day" : "calendar",
    enable_table_orders: row.enable_table_orders ?? true,
    enable_package_orders: row.enable_package_orders ?? true,
  };
}
