import type { DeliveryStatus } from "@/lib/fulfillment";

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Bekliyor",
  preparing: "Hazırlanıyor",
  ready_for_dispatch: "Kuryeye hazır",
  out_for_delivery: "Yolda",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};

export const KASA_DELIVERY_FLOW_STATUSES: DeliveryStatus[] = [
  "pending",
  "preparing",
  "ready_for_dispatch",
  "out_for_delivery",
];
