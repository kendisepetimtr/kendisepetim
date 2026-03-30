import type { MenuFabTheme } from "../lib/menu-layout";

export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  waiter_pin: string | null;
  table_count: number | null;
  admin_username: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  logo_url: string | null;
  /** Yüklü logo dosyasının Storage yolu; doluysa logo_url bu path’ten türetilir. */
  logo_storage_path: string | null;
  brand_color: string | null;
  /** Kapak görseli Storage yolu; doluysa cover_url türetilir. */
  cover_storage_path: string | null;
  cover_url: string | null;
  theme_accent: string | null;
  theme_surface: string | null;
  font_heading: string;
  font_body: string;
  /** Müşteri menü şablonu (galeri varyantları). */
  menu_layout: MenuFabTheme;
  fab_call_enabled: boolean;
  fab_call_phone: string | null;
  fab_whatsapp_enabled: boolean;
  fab_whatsapp_phone: string | null;
  fab_location_enabled: boolean;
  fab_location_lat: number | null;
  fab_location_lng: number | null;
  is_active: boolean;
  created_at: string;
};
