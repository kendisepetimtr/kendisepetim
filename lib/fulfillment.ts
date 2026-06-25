export type FulfillmentType = "pickup" | "delivery";

export const DEFAULT_DELIVERY_RADIUS_KM = 5;
export const MIN_DELIVERY_RADIUS_KM = 1;
export const MAX_DELIVERY_RADIUS_KM = 15;

export const MARKETPLACE_MIN_PRODUCT_COUNT = 5;

export type TenantFulfillmentFlags = {
  fulfillmentPickupEnabled: boolean;
  fulfillmentDeliveryEnabled: boolean;
  deliveryRadiusKm: number;
  minOrderAmount: number | null;
  latitude: number | null;
  longitude: number | null;
};

export function clampDeliveryRadiusKm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DELIVERY_RADIUS_KM;
  return Math.min(MAX_DELIVERY_RADIUS_KM, Math.max(MIN_DELIVERY_RADIUS_KM, Math.round(value * 10) / 10));
}

export function resolveDefaultFulfillmentType(flags: Pick<TenantFulfillmentFlags, "fulfillmentPickupEnabled" | "fulfillmentDeliveryEnabled">): FulfillmentType | null {
  if (flags.fulfillmentPickupEnabled && !flags.fulfillmentDeliveryEnabled) return "pickup";
  if (flags.fulfillmentDeliveryEnabled && !flags.fulfillmentPickupEnabled) return "delivery";
  if (flags.fulfillmentPickupEnabled && flags.fulfillmentDeliveryEnabled) return "delivery";
  return null;
}

export function fulfillmentTypeLabel(type: FulfillmentType): string {
  return type === "pickup" ? "Gel-al" : "Teslimat";
}
