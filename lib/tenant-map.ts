import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  normalizeTimeString,
  type BusinessHoursDayMode,
} from "@/lib/business-hours";
import { clampDeliveryRadiusKm } from "@/lib/fulfillment";
import type { LocalTenantProfile } from "@/lib/local-tenant";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { resolveEnabledMealCardBrands } from "@/lib/tenant-payment";
import { normalizeTenantPlan } from "@/lib/tenant-entitlements";

/** Supabase `tenants` satırını panelin kullandığı profile çevirir. */
export function tenantRowToLocalProfile(row: TenantRow): LocalTenantProfile {
  const logo = row.logo_url?.trim() ?? "";
  const hoursDayMode: BusinessHoursDayMode = row.hours_day_mode === "shift" ? "shift" : "calendar";
  return {
    businessName: row.business_name ?? "",
    subdomain: row.subdomain ?? "",
    ownerName: row.owner_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    registeredAt: row.created_at ?? new Date().toISOString(),
    logoDataUrl: logo,
    coverImageUrl: row.cover_image_url?.trim() ?? "",
    publicDescription: row.public_description ?? "",
    googleMapsUrl: row.google_maps_url?.trim() ?? "",
    googleReviewsUrl: row.google_reviews_url?.trim() ?? "",
    seoIndexEnabled: row.seo_index_enabled === true,
    publicMenuEnabled: row.public_menu_enabled !== false,
    hoursDayMode,
    openTime: normalizeTimeString(row.open_time ?? DEFAULT_OPEN_TIME, DEFAULT_OPEN_TIME),
    closeTime: normalizeTimeString(row.close_time ?? DEFAULT_CLOSE_TIME, DEFAULT_CLOSE_TIME),
    paymentCash: row.payment_cash !== false,
    paymentDoorCard: row.payment_door_card === true,
    paymentMealCard: row.payment_meal_card === true,
    paymentMealCardBrands: resolveEnabledMealCardBrands(
      row.payment_meal_card === true,
      row.payment_meal_card_brands,
    ),
    marketplaceEnabled: row.marketplace_enabled === true,
    marketplaceVitrinApproved: row.marketplace_vitrin_approved === true,
    plan: normalizeTenantPlan(row.plan),
    trialEndsAt: row.trial_ends_at?.trim() ? row.trial_ends_at : null,
    city: row.city ?? "",
    district: row.district ?? "",
    neighborhood: row.neighborhood ?? "",
    cuisineTags: Array.isArray(row.cuisine_tags) ? row.cuisine_tags : [],
    latitude: row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
    longitude: row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
    deliveryRadiusKm: clampDeliveryRadiusKm(Number(row.delivery_radius_km ?? 5)),
    fulfillmentPickupEnabled: row.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: row.fulfillment_delivery_enabled === true,
    minOrderAmount:
      row.min_order_amount != null && Number.isFinite(Number(row.min_order_amount))
        ? Number(row.min_order_amount)
        : null,
    tableCount: Number.isFinite(Number(row.table_count)) ? Math.max(0, Number(row.table_count)) : 0,
    dineInEnabled: row.dine_in_enabled === true,
    orderEtaAutoEnabled: row.order_eta_auto_enabled === true,
    orderEtaMode: row.order_eta_mode === "stages" ? "stages" : "total",
    orderEtaTotalMinutes: Number(row.order_eta_total_minutes ?? 15) || 15,
    orderEtaPrepMinutes: Number(row.order_eta_prep_minutes ?? 10) || 10,
    orderEtaReadyMinutes: Number(row.order_eta_ready_minutes ?? 12) || 12,
    orderEtaDispatchMinutes: Number(row.order_eta_dispatch_minutes ?? 15) || 15,
    orderEtaDeliverMinutes: Number(row.order_eta_deliver_minutes ?? 30) || 30,
  };
}
