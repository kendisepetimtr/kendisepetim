import type { FulfillmentType } from "@/lib/fulfillment";
import type { LocalMenuProduct } from "@/lib/local-menu";
import { sumVariationDeltas } from "@/lib/menu-variations";

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

/** Gel-al ve paket fiyatı farklıysa ikincil fiyat (gösterim için). */
export function getSecondaryMenuDisplayPrice(
  p: LocalMenuProduct,
  flags: { fulfillmentPickupEnabled: boolean; fulfillmentDeliveryEnabled: boolean },
): number | null {
  if (!flags.fulfillmentPickupEnabled || !flags.fulfillmentDeliveryEnabled) return null;
  if (!p.usePackagePrice) return null;
  const pickup = getPickupProductPrice(p);
  const delivery = getDeliveryProductPrice(p);
  if (pickup === delivery) return null;
  // Birincil paket fiyatıysa gel-al’ı ikincil göster
  return pickup;
}

/** Birincil fiyat + seçilen varyasyon farkları. */
export function getPrimaryMenuDisplayPriceWithVariations(
  p: LocalMenuProduct,
  flags: { fulfillmentPickupEnabled: boolean; fulfillmentDeliveryEnabled: boolean },
  selected: readonly { priceDelta: number }[],
): number {
  return getPrimaryMenuDisplayPrice(p, flags) + sumVariationDeltas(selected);
}

/** Teslimat tipine göre fiyat + seçilen varyasyon farkları. */
export function getProductPriceForFulfillmentWithVariations(
  p: LocalMenuProduct,
  fulfillmentType: FulfillmentType,
  selected: readonly { priceDelta: number }[],
): number {
  return getProductPriceForFulfillment(p, fulfillmentType) + sumVariationDeltas(selected);
}
