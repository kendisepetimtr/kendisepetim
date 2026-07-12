import type { FulfillmentType } from "@/lib/fulfillment";
import type { TenantReceiptSettings } from "@/lib/receipt-settings";

/**
 * Kasa sipariş tamamlamada kanal bazlı fiş seti:
 * - Masa: yalnız mutfak
 * - Gel-al: müşteri + mutfak
 * - Paket: müşteri + mutfak + kurye
 */
export function receiptSettingsForKasaChannel(
  base: TenantReceiptSettings,
  channel: FulfillmentType,
): TenantReceiptSettings {
  const common: TenantReceiptSettings = {
    ...base,
    enabled: true,
    autoPrintOnNewOrder: true,
    customerCopies: 1,
  };

  if (channel === "dine_in") {
    return {
      ...common,
      customerReceiptEnabled: false,
      kitchenReceiptEnabled: true,
      courierReceiptEnabled: false,
    };
  }

  if (channel === "pickup") {
    return {
      ...common,
      customerReceiptEnabled: true,
      kitchenReceiptEnabled: true,
      courierReceiptEnabled: false,
    };
  }

  return {
    ...common,
    customerReceiptEnabled: true,
    kitchenReceiptEnabled: true,
    courierReceiptEnabled: true,
  };
}
