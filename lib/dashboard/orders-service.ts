import { writeActivityLog } from "@/lib/activity-log";
import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { buildAdminOrders } from "@/lib/order-map";
import type { AdminOrder } from "@/lib/orders";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/supabase/order-types";
import type { FulfillmentType } from "@/lib/fulfillment";
import { cancelKitchenOrder, markOrderSeenIfNeeded } from "@/lib/kitchen-orders";
import { compareKitchenUrgency } from "@/lib/order-sla";

export type OrderChannelFilter = "all" | FulfillmentType;

export type DashboardOrdersResult =
  | { ok: true; orders: AdminOrder[] }
  | { ok: false; error: string };

const ORDER_COLUMNS =
  "id, created_at, updated_at, tenant_id, order_code, daily_number, order_source, status, total, customer_first_name, customer_last_name, customer_phone, customer_email, address_json, payment_method, payment_method_at_close, meal_card_brand_id, paid_at, order_note, courier_note, fulfillment_type, customer_latitude, customer_longitude, table_number, table_session_id, courier_id, delivery_status, seen_at, cancel_reason, cancel_note";

export async function loadDashboardOrderById(orderId: string): Promise<DashboardOrdersResult> {
  if (!orderId) return { ok: false, error: "Geçersiz sipariş." };

  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    const { data: row, error } = await svc
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", orderId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Sipariş bulunamadı." };

    const { data: lineRows, error: lineErr } = await svc
      .from("order_lines")
      .select("*")
      .eq("order_id", orderId);

    if (lineErr) return { ok: false, error: lineErr.message };

    const orders = await enrichOrdersWithCourierNames(tenant.id, buildAdminOrders([row], lineRows ?? []));
    return { ok: true, orders };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sipariş yüklenemedi.",
    };
  }
}

export async function loadDashboardOrders(channel: OrderChannelFilter): Promise<DashboardOrdersResult> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    let query = svc
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (channel !== "all") {
      query = query.eq("fulfillment_type", channel);
    }

    const { data: rows, error } = await query;
    if (error) return { ok: false, error: error.message };

    const orderIds = (rows ?? []).map((r) => r.id as string);
    if (orderIds.length === 0) {
      return { ok: true, orders: [] };
    }

    const { data: lineRows, error: lineErr } = await svc
      .from("order_lines")
      .select("*")
      .in("order_id", orderIds);

    if (lineErr) return { ok: false, error: lineErr.message };

    const orders = await enrichOrdersWithCourierNames(tenant.id, buildAdminOrders(rows ?? [], lineRows ?? []));
    orders.sort((a, b) => compareKitchenUrgency(a, b) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { ok: true, orders };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Siparişler yüklenemedi.",
    };
  }
}

async function enrichOrdersWithCourierNames(
  tenantId: string,
  orders: AdminOrder[],
): Promise<AdminOrder[]> {
  const courierIds = Array.from(
    new Set(orders.map((o) => o.courierId).filter((id): id is string => Boolean(id))),
  );
  if (courierIds.length === 0) return orders;

  try {
    const svc = createServiceSupabaseClient();
    const { data } = await svc.from("couriers").select("*").eq("tenant_id", tenantId).in("id", courierIds);
    const byId = new Map<string, string>();
    for (const c of data ?? []) {
      const row = c as { id: string; first_name: string; last_name: string };
      byId.set(row.id, `${row.first_name} ${row.last_name}`.trim());
    }
    return orders.map((o) => ({
      ...o,
      courierName: o.courierId ? byId.get(o.courierId) ?? null : null,
    }));
  } catch {
    return orders;
  }
}

export async function markDashboardOrderSeen(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!orderId) return { ok: false, error: "Geçersiz sipariş." };
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };
  try {
    const svc = createServiceSupabaseClient();
    await markOrderSeenIfNeeded(svc, tenant.id, orderId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateDashboardOrderStatus(
  orderId: string,
  status: OrderStatus,
  cancel?: { reason?: unknown; note?: unknown },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!orderId) return { ok: false, error: "Geçersiz sipariş." };
  if (!["new", "confirmed", "preparing", "completed", "cancelled"].includes(status)) {
    return { ok: false, error: "Geçersiz sipariş durumu." };
  }

  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    if (status === "cancelled") {
      return cancelKitchenOrder(svc, {
        tenantId: tenant.id,
        orderId,
        reason: cancel?.reason,
        note: cancel?.note,
        actorType: "owner",
        actorLabel: tenant.owner_name || "Dashboard",
        panel: "dashboard",
      });
    }

    const { data: existing, error: findErr } = await svc
      .from("orders")
      .select("id, order_code, status, fulfillment_type, seen_at")
      .eq("id", orderId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (findErr || !existing) {
      return { ok: false, error: "Sipariş bulunamadı." };
    }

    const patch: Record<string, unknown> = { status };
    if (!existing.seen_at) {
      patch.seen_at = new Date().toISOString();
    }

    const { error } = await svc.from("orders").update(patch).eq("id", orderId).eq("tenant_id", tenant.id);
    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "order_status_updated",
      entity_type: "order",
      entity_id: orderId,
      order_code: existing.order_code as string,
      metadata: {
        from: existing.status,
        to: status,
        fulfillment_type: existing.fulfillment_type,
        panel: "dashboard",
      },
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sipariş güncellenemedi.",
    };
  }
}

/**
 * Deneme / temiz kurulum için: siparişler, masa oturumları ve operasyon logları silinir.
 * Menü, müşteri (yerel), kurye/garson ve işletme ayarları korunur.
 */
export async function clearAllOrdersData(): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();

    // order_lines → orders üzerinde cascade
    const { error: ordersErr } = await svc.from("orders").delete().eq("tenant_id", tenant.id);
    if (ordersErr) return { ok: false, error: ordersErr.message };

    const { error: sessionsErr } = await svc.from("table_sessions").delete().eq("tenant_id", tenant.id);
    if (sessionsErr) return { ok: false, error: sessionsErr.message };

    const { error: logsErr } = await svc.from("activity_logs").delete().eq("tenant_id", tenant.id);
    if (logsErr) return { ok: false, error: logsErr.message };

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Siparişler sıfırlanamadı.",
    };
  }
}
