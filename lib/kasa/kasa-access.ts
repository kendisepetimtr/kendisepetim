import type { TenantRow } from "@/lib/supabase/tenant-types";

export type KasaFeatures = {
  dineIn: boolean;
  pickup: boolean;
};

export function getKasaFeatures(tenant: Pick<TenantRow, "dine_in_enabled" | "table_count" | "fulfillment_pickup_enabled">): KasaFeatures {
  return {
    dineIn: tenant.dine_in_enabled === true && (tenant.table_count ?? 0) > 0,
    pickup: tenant.fulfillment_pickup_enabled !== false,
  };
}

export function canUseKasa(tenant: Pick<
  TenantRow,
  "cashier_pin_hash" | "cashier_pin_set_at" | "dine_in_enabled" | "table_count" | "fulfillment_pickup_enabled"
>): boolean {
  if (!tenant.cashier_pin_hash || !tenant.cashier_pin_set_at) return false;
  const features = getKasaFeatures(tenant);
  return features.dineIn || features.pickup;
}

export function kasaAccessError(
  tenant: Pick<TenantRow, "dine_in_enabled" | "table_count" | "fulfillment_pickup_enabled">,
): string | null {
  const features = getKasaFeatures(tenant);
  if (!features.dineIn && !features.pickup) {
    return "Kasa için masa servisi veya gel-al siparişi aktif olmalıdır.";
  }
  return null;
}
