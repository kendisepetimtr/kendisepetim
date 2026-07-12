/**
 * public.tenants satırı — supabase/migrations ile uyumlu.
 * Şema değişince burayı ve migration'ı birlikte güncelleyin.
 */
export type TenantPlan = "free" | "premium";

export type TenantHoursDayMode = "calendar" | "shift";

export type TenantRow = {
  id: string;
  created_at: string;
  updated_at: string;
  business_name: string;
  subdomain: string;
  owner_name: string;
  email: string;
  phone: string;
  owner_user_id: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  public_description: string;
  google_maps_url: string | null;
  seo_index_enabled: boolean;
  hours_day_mode: TenantHoursDayMode;
  open_time: string;
  close_time: string;
  payment_cash: boolean;
  payment_door_card: boolean;
  payment_meal_card: boolean;
  /** Aktif yemek kartı marka id'leri */
  payment_meal_card_brands?: string[] | null;
  plan: TenantPlan;
  public_menu_enabled: boolean;
  dashboard_enabled: boolean;
  marketplace_enabled: boolean;
  city: string;
  district: string;
  neighborhood: string;
  cuisine_tags: string[];
  latitude: number | null;
  longitude: number | null;
  delivery_radius_km: number;
  fulfillment_pickup_enabled: boolean;
  fulfillment_delivery_enabled: boolean;
  min_order_amount: number | null;
  owner_admin_pin_hash: string | null;
  owner_admin_pin_set_at: string | null;
  table_count: number;
  dine_in_enabled: boolean;
  waiter_pin_hash: string | null;
  waiter_pin_set_at: string | null;
  cashier_pin_hash: string | null;
  cashier_pin_set_at: string | null;
};

export type TenantInsert = Omit<
  TenantRow,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TenantUpdate = Partial<
  Omit<TenantRow, "id" | "created_at" | "updated_at">
>;
