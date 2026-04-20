import type { LocalTenantProfile } from "@/lib/local-tenant";
import type { TenantRow } from "@/lib/supabase/tenant-types";

/** Supabase `tenants` satırını panelin kullandığı profile çevirir. */
export function tenantRowToLocalProfile(row: TenantRow): LocalTenantProfile {
  const logo = row.logo_url?.trim() ?? "";
  return {
    businessName: row.business_name,
    subdomain: row.subdomain,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    registeredAt: row.created_at,
    logoDataUrl: logo,
    coverImageUrl: row.cover_image_url?.trim() ?? "",
    publicDescription: row.public_description,
    googleMapsUrl: row.google_maps_url?.trim() ?? "",
    seoIndexEnabled: row.seo_index_enabled === true,
    hoursDayMode: row.hours_day_mode,
    openTime: row.open_time,
    closeTime: row.close_time,
    paymentCash: row.payment_cash,
    paymentDoorCard: row.payment_door_card,
    paymentMealCard: row.payment_meal_card,
  };
}
