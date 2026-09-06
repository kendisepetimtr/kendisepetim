import type { LocalTenantProfile } from "@/lib/local-tenant";
import { slimTenantProfileForClient } from "@/lib/tenant-client-sync";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";
import { resolveAccountKind } from "@/lib/account-kind";

export type DashboardTenantSyncResult =
  | { ok: true; profile: LocalTenantProfile }
  | { ok: false; error: string; accountKind?: "restaurant" | "customer" | "unknown" };

const TENANT_SYNC_COLUMNS = [
  "business_name",
  "subdomain",
  "owner_name",
  "email",
  "phone",
  "created_at",
  "logo_url",
  "cover_image_url",
  "public_description",
  "google_maps_url",
  "google_reviews_url",
  "seo_index_enabled",
  "public_menu_enabled",
  "hours_day_mode",
  "open_time",
  "close_time",
  "payment_cash",
  "payment_door_card",
  "payment_meal_card",
  "payment_meal_card_brands",
  "marketplace_enabled",
  "marketplace_vitrin_approved",
  "plan",
  "trial_ends_at",
  "city",
  "district",
  "neighborhood",
  "cuisine_tags",
  "latitude",
  "longitude",
  "delivery_radius_km",
  "fulfillment_pickup_enabled",
  "fulfillment_delivery_enabled",
  "min_order_amount",
  "table_count",
  "dine_in_enabled",
].join(", ");

/** Panel profilini sunucudan okur; logo/kapak client yanıtında kırpılır. */
export async function loadDashboardTenantProfile(): Promise<DashboardTenantSyncResult> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase bağlantısı kurulamadı." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Oturum bulunamadı." };

    const { data: row, error } = await supabase
      .from("tenants")
      .select(TENANT_SYNC_COLUMNS)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      const accountKind = await resolveAccountKind(user);
      return { ok: false, error: "İşletme kaydı bulunamadı.", accountKind };
    }

    const profile = slimTenantProfileForClient(tenantRowToLocalProfile(row as unknown as TenantRow));
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Profil senkronu başarısız.",
    };
  }
}
