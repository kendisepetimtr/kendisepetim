import type { OrderChannel, OrderType } from "../../types";

export const DELIVERY_FEE_TRY = 30;

/** Kapatırken kurye seçimi zorunlu: paket veya online teslimat. */
export function orderRequiresCourierOnClose(channel: OrderChannel, orderType: OrderType): boolean {
  return channel === "package" || (channel === "online" && orderType === "delivery");
}
