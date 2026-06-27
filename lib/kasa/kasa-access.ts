import type { TenantRow } from "@/lib/supabase/tenant-types";

export type KasaFeatures = {
  dineIn: boolean;
  pickup: boolean;
  delivery: boolean;
};

export function getKasaFeatures(
  tenant: Pick<
    TenantRow,
    "dine_in_enabled" | "table_count" | "fulfillment_pickup_enabled" | "fulfillment_delivery_enabled"
  >,
): KasaFeatures {
  return {
    dineIn: tenant.dine_in_enabled === true && (tenant.table_count ?? 0) > 0,
    pickup: tenant.fulfillment_pickup_enabled !== false,
    delivery: tenant.fulfillment_delivery_enabled === true,
  };
}

export function canUseKasa(
  tenant: Pick<
    TenantRow,
    | "cashier_pin_hash"
    | "cashier_pin_set_at"
    | "dine_in_enabled"
    | "table_count"
    | "fulfillment_pickup_enabled"
    | "fulfillment_delivery_enabled"
  >,
): boolean {
  if (!tenant.cashier_pin_hash || !tenant.cashier_pin_set_at) return false;
  const features = getKasaFeatures(tenant);
  return features.dineIn || features.pickup || features.delivery;
}

export function kasaAccessError(
  tenant: Pick<
    TenantRow,
    "dine_in_enabled" | "table_count" | "fulfillment_pickup_enabled" | "fulfillment_delivery_enabled"
  >,
): string | null {
  const features = getKasaFeatures(tenant);
  if (!features.dineIn && !features.pickup && !features.delivery) {
    return "Kasa için masa servisi, gel-al veya paket siparişi aktif olmalıdır.";
  }
  return null;
}

export function getDefaultKasaPath(features: KasaFeatures): string {
  if (features.dineIn) return "/kasa";
  if (features.pickup) return "/kasa/gel-al";
  if (features.delivery) return "/kasa/paket";
  return "/kasa";
}
