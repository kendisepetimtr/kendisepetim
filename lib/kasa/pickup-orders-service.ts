import { writeActivityLog } from "@/lib/activity-log";
import { buildAdminOrders } from "@/lib/order-map";
import type { AdminOrder } from "@/lib/orders";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";
import type { CheckoutPaymentMethod, MealCardBrandId, TenantPaymentFlags } from "@/lib/tenant-payment";
import { isMealCardBrandAllowed } from "@/lib/tenant-payment";

function isPaymentMethodEnabled(flags: TenantPaymentFlags, method: CheckoutPaymentMethod): boolean {
  if (method === "cash") return flags.paymentCash;
  if (method === "door_card") return flags.paymentDoorCard;
  return flags.paymentMealCard;
}

async function loadOrderWithLines(tenantId: string, orderId: string): Promise<AdminOrder | null> {
  const svc = createServiceSupabaseClient();
  const { data: row, error } = await svc
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !row) return null;

  const { data: lines } = await svc
    .from("order_lines")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  return buildAdminOrders([row as OrderRow], (lines ?? []) as OrderLineRow[])[0] ?? null;
}

export async function loadKasaPickupOrders(
  tenantId: string,
): Promise<{ ok: true; orders: AdminOrder[] } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { data: rows, error } = await svc
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fulfillment_type", "pickup")
      .in("status", ["new", "confirmed", "preparing"])
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return { ok: false, error: error.message };
    }

    const orderRows = (rows ?? []) as OrderRow[];
    if (orderRows.length === 0) {
      return { ok: true, orders: [] };
    }

    const orderIds = orderRows.map((o) => o.id);
    const { data: lineRows, error: lineErr } = await svc
      .from("order_lines")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("order_id", orderIds);

    if (lineErr) {
      return { ok: false, error: lineErr.message };
    }

    return { ok: true, orders: buildAdminOrders(orderRows, (lineRows ?? []) as OrderLineRow[]) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gel-al siparişleri yüklenemedi." };
  }
}

export async function loadKasaPickupOrderDetail(
  tenantId: string,
  orderId: string,
): Promise<{ ok: true; order: AdminOrder } | { ok: false; error: string }> {
  if (!orderId) {
    return { ok: false, error: "Geçersiz sipariş." };
  }

  try {
    const order = await loadOrderWithLines(tenantId, orderId);
    if (!order) {
      return { ok: false, error: "Sipariş bulunamadı." };
    }
    if (order.fulfillmentType !== "pickup") {
      return { ok: false, error: "Bu sipariş gel-al değil." };
    }
    if (order.status === "completed" || order.status === "cancelled") {
      return { ok: false, error: "Sipariş zaten kapatılmış." };
    }

    return { ok: true, order };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sipariş yüklenemedi." };
  }
}

export async function closePickupOrderWithPayment(input: {
  tenantId: string;
  orderId: string;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  paymentFlags: TenantPaymentFlags;
}): Promise<{ ok: true; orderCode: string; total: number; paidAt: string } | { ok: false; error: string }> {
  const detail = await loadKasaPickupOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  if (!isPaymentMethodEnabled(input.paymentFlags, input.paymentMethod)) {
    return { ok: false, error: "Bu ödeme yöntemi aktif değil." };
  }
  if (input.paymentMethod === "meal_card") {
    if (!isMealCardBrandAllowed(input.paymentFlags, input.mealCardBrandId)) {
      return { ok: false, error: "Bu yemek kartı markası bu işletmede aktif değil." };
    }
  }

  try {
    const svc = createServiceSupabaseClient();
    const paidAt = new Date().toISOString();
    const orderUpdate: Record<string, unknown> = {
      status: "completed",
      payment_method_at_close: input.paymentMethod,
      paid_at: paidAt,
    };
    if (input.paymentMethod === "meal_card") {
      orderUpdate.meal_card_brand_id = input.mealCardBrandId;
    }

    const { error } = await svc
      .from("orders")
      .update(orderUpdate)
      .eq("id", input.orderId)
      .eq("tenant_id", input.tenantId)
      .eq("fulfillment_type", "pickup");

    if (error) {
      return { ok: false, error: error.message };
    }

    await writeActivityLog({
      tenant_id: input.tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "payment_closed",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        fulfillment_type: "pickup",
        method: input.paymentMethod,
        meal_card: input.paymentMethod === "meal_card" ? input.mealCardBrandId : null,
        total: detail.order.total,
        paid_at: paidAt,
      },
    });

    return {
      ok: true,
      orderCode: detail.order.orderCode,
      total: detail.order.total,
      paidAt,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ödeme kaydedilemedi." };
  }
}
