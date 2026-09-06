import { writeActivityLog } from "@/lib/activity-log";
import {
  formatCancelReasonForCustomer,
  isOrderCancelReason,
  type OrderCancelReason,
} from "@/lib/order-cancel";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function markOrderSeenIfNeeded(
  svc: SupabaseClient,
  tenantId: string,
  orderId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await svc
    .from("orders")
    .update({ seen_at: now })
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .is("seen_at", null);
}

export async function cancelKitchenOrder(
  svc: SupabaseClient,
  input: {
    tenantId: string;
    orderId: string;
    reason: unknown;
    note?: unknown;
    actorType: "owner" | "admin" | "cashier";
    actorLabel: string;
    panel: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isOrderCancelReason(input.reason)) {
    return { ok: false, error: "İptal nedeni seçin." };
  }
  const reason: OrderCancelReason = input.reason;
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 280) : "";

  const { data: existing, error: findErr } = await svc
    .from("orders")
    .select("id, order_code, status, fulfillment_type, seen_at")
    .eq("id", input.orderId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (findErr || !existing) {
    return { ok: false, error: "Sipariş bulunamadı." };
  }
  if (existing.status === "cancelled") {
    return { ok: false, error: "Sipariş zaten iptal edilmiş." };
  }
  if (existing.status === "completed") {
    return { ok: false, error: "Tamamlanmış sipariş iptal edilemez." };
  }

  const patch: Record<string, unknown> = {
    status: "cancelled",
    delivery_status: "cancelled",
    cancel_reason: reason,
    cancel_note: note,
  };
  if (!existing.seen_at) {
    patch.seen_at = new Date().toISOString();
  }

  const { error } = await svc
    .from("orders")
    .update(patch)
    .eq("id", input.orderId)
    .eq("tenant_id", input.tenantId);

  if (error) return { ok: false, error: error.message };

  await writeActivityLog({
    tenant_id: input.tenantId,
    actor_type: input.actorType,
    actor_label: input.actorLabel,
    action: "order_cancelled",
    entity_type: "order",
    entity_id: input.orderId,
    order_code: existing.order_code as string,
    metadata: {
      from: existing.status,
      to: "cancelled",
      fulfillment_type: existing.fulfillment_type,
      panel: input.panel,
      cancel_reason: reason,
      cancel_note: note,
      customer_message: formatCancelReasonForCustomer(reason, note),
    },
  });

  return { ok: true };
}
