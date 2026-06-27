import type { OrderStatus } from "@/lib/supabase/order-types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Yeni",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const DASHBOARD_ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
];
