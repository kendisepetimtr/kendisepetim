import type { FulfillmentType } from "@/lib/fulfillment";
import type { LocalMenuProduct } from "@/lib/local-menu";

/** Teslimat fiyatı — paket fiyat mantığı. */
export function getDeliveryProductPrice(p: LocalMenuProduct): number {
  return p.usePackagePrice ? p.packagePrice : p.price;
}

/** Gel-al fiyatı — her zaman normal fiyat. */
export function getPickupProductPrice(p: LocalMenuProduct): number {
  return p.price;
}

export function getProductPriceForFulfillment(
  p: LocalMenuProduct,
  fulfillmentType: FulfillmentType,
): number {
  if (fulfillmentType === "pickup" || fulfillmentType === "dine_in") {
    return getPickupProductPrice(p);
  }
  return getDeliveryProductPrice(p);
}

/** Menü listesinde gösterilecek birincil fiyat. */
export function getPrimaryMenuDisplayPrice(
  p: LocalMenuProduct,
  flags: { fulfillmentPickupEnabled: boolean; fulfillmentDeliveryEnabled: boolean },
): number {
  if (flags.fulfillmentDeliveryEnabled) return getDeliveryProductPrice(p);
  return getPickupProductPrice(p);
}
