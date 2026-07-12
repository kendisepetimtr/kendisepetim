import { writeActivityLog } from "@/lib/activity-log";
import { buildAdminOrders } from "@/lib/order-map";
import type { AdminOrder } from "@/lib/orders";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";
import type { TableSessionStatus } from "@/lib/supabase/table-session-types";
import type { CheckoutPaymentMethod, MealCardBrandId, TenantPaymentFlags } from "@/lib/tenant-payment";

export type KasaSessionDetail = {
  tableNumber: number;
  sessionId: string;
  status: TableSessionStatus;
  openedAt: string;
  orders: AdminOrder[];
  sessionTotal: number;
};

export async function loadKasaSessionDetail(
  tenantId: string,
  tableNumber: number,
): Promise<{ ok: true; session: KasaSessionDetail } | { ok: false; error: string }> {
  if (tableNumber < 1) {
    return { ok: false, error: "Geçersiz masa numarası." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data: session, error: sessionErr } = await svc
      .from("table_sessions")
      .select("id, table_number, status, opened_at")
      .eq("tenant_id", tenantId)
      .eq("table_number", tableNumber)
      .in("status", ["active", "bill_requested"])
      .maybeSingle();

    if (sessionErr) {
      return { ok: false, error: sessionErr.message };
    }
    if (!session?.id) {
      return { ok: false, error: "Bu masada açık oturum yok." };
    }

    const { data: orderRows, error: orderErr } = await svc
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("table_session_id", session.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (orderErr) {
      return { ok: false, error: orderErr.message };
    }

    const orders = (orderRows ?? []) as OrderRow[];
    const orderIds = orders.map((o) => o.id);
    let lineRows: OrderLineRow[] = [];

    if (orderIds.length > 0) {
      const { data: lines, error: lineErr } = await svc
        .from("order_lines")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("order_id", orderIds)
        .order("sort_order", { ascending: true });

      if (lineErr) {
        return { ok: false, error: lineErr.message };
      }
      lineRows = (lines ?? []) as OrderLineRow[];
    }

    const adminOrders = buildAdminOrders(orders, lineRows);
    const sessionTotal = adminOrders.reduce((sum, o) => sum + o.total, 0);

    return {
      ok: true,
      session: {
        tableNumber,
        sessionId: session.id as string,
        status: session.status as TableSessionStatus,
        openedAt: session.opened_at as string,
        orders: adminOrders,
        sessionTotal: Math.round(sessionTotal * 100) / 100,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Oturum yüklenemedi." };
  }
}

function isPaymentMethodEnabled(flags: TenantPaymentFlags, method: CheckoutPaymentMethod): boolean {
  if (method === "cash") return flags.paymentCash;
  if (method === "door_card") return flags.paymentDoorCard;
  return flags.paymentMealCard;
}

export async function closeSessionWithPayment(input: {
  tenantId: string;
  tableNumber: number;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  paymentFlags: TenantPaymentFlags;
}): Promise<{ ok: true; sessionTotal: number; orderCount: number; paidAt: string } | { ok: false; error: string }> {
  const { tenantId, tableNumber, paymentMethod, paymentFlags } = input;

  if (!isPaymentMethodEnabled(paymentFlags, paymentMethod)) {
    return { ok: false, error: "Bu ödeme yöntemi aktif değil." };
  }
  if (paymentMethod === "meal_card") {
    const brand = input.mealCardBrandId;
    if (brand !== "multinet" && brand !== "sodexo" && brand !== "edenred") {
      return { ok: false, error: "Yemek kartı türü seçilmelidir." };
    }
  }

  const detail = await loadKasaSessionDetail(tenantId, tableNumber);
  if (!detail.ok) {
    return detail;
  }

  const payableOrders = detail.session.orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  if (payableOrders.length === 0) {
    return { ok: false, error: "Tahsil edilecek sipariş yok." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const now = new Date().toISOString();
    const orderIds = payableOrders.map((o) => o.id);
    const sessionTotal = payableOrders.reduce((sum, o) => sum + o.total, 0);

    const orderUpdate: Record<string, unknown> = {
      status: "completed",
      payment_method_at_close: paymentMethod,
      paid_at: now,
    };
    if (paymentMethod === "meal_card") {
      orderUpdate.meal_card_brand_id = input.mealCardBrandId;
    }

    const { error: ordersErr } = await svc
      .from("orders")
      .update(orderUpdate)
      .eq("tenant_id", tenantId)
      .in("id", orderIds);

    if (ordersErr) {
      return { ok: false, error: ordersErr.message };
    }

    const { error: sessionErr } = await svc
      .from("table_sessions")
      .update({ status: "closed", closed_at: now })
      .eq("id", detail.session.sessionId)
      .eq("tenant_id", tenantId);

    if (sessionErr) {
      return { ok: false, error: sessionErr.message };
    }

    await writeActivityLog({
      tenant_id: tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "payment_closed",
      entity_type: "table_session",
      entity_id: detail.session.sessionId,
      order_code: null,
      metadata: {
        table: tableNumber,
        method: paymentMethod,
        meal_card: paymentMethod === "meal_card" ? input.mealCardBrandId : null,
        total: sessionTotal,
        order_count: payableOrders.length,
        paid_at: now,
      },
    });

    return {
      ok: true,
      sessionTotal: Math.round(sessionTotal * 100) / 100,
      orderCount: payableOrders.length,
      paidAt: now,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ödeme kaydedilemedi." };
  }
}
