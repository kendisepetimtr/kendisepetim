import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";

/** Admin panelinde okunabilir etiketler. */
export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  order_created: "Sipariş oluşturuldu",
  order_cancelled: "Sipariş iptal edildi",
  order_status_updated: "Sipariş durumu güncellendi",
  order_confirmed: "Sipariş onaylandı",
  payment_closed: "Ödeme alındı",
  payment_method_updated: "Ödeme yöntemi güncellendi",
  delivery_completed: "Paket teslimat tamamlandı",
  delivery_status_updated: "Paket durumu güncellendi",
  courier_assigned: "Kurye atandı",
  courier_created: "Kurye eklendi",
  courier_updated: "Kurye güncellendi",
  courier_deleted: "Kurye silindi",
  operations_settings_updated: "Operasyon ayarları güncellendi",
  staff_pin_updated: "Personel PIN güncellendi",
  bill_requested: "Hesap istendi",
  notification_settings_updated: "Bildirim ayarları güncellendi",
  receipt_settings_updated: "Fiş ayarları güncellendi",
};

export const ACTIVITY_ACTOR_LABELS: Record<string, string> = {
  owner: "Sahip",
  admin: "Admin",
  waiter: "Garson",
  cashier: "Kasiyer",
  system: "Sistem",
  customer: "Müşteri",
};

export function formatActivityLogSummary(log: ActivityLogRow): string {
  const meta = log.metadata ?? {};
  const parts: string[] = [];

  if (log.order_code) parts.push(log.order_code);
  if (typeof meta.table === "number") parts.push(`Masa ${meta.table}`);
  if (typeof meta.fulfillment_type === "string") parts.push(String(meta.fulfillment_type));
  if (typeof meta.courier === "string") parts.push(String(meta.courier));
  if (typeof meta.method === "string") parts.push(String(meta.method));
  if (typeof meta.from === "string" && typeof meta.to === "string") {
    parts.push(`${meta.from} → ${meta.to}`);
  }

  return parts.join(" · ") || "—";
}
