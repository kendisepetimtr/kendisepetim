import type { OrderStatus } from "../types";

export const ORDER_STATUS_LABELS_TR: Record<OrderStatus, string> = {
  pending: "Beklemede",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};

export function orderStatusLabelTr(status: OrderStatus): string {
  return ORDER_STATUS_LABELS_TR[status] ?? status;
}
