import { writeActivityLog } from "@/lib/activity-log";
import { cancelKitchenOrder, markOrderSeenIfNeeded } from "@/lib/kitchen-orders";
import { compareKitchenUrgency } from "@/lib/order-sla";
import { buildAdminOrders } from "@/lib/order-map";
import type { DeliveryStatus } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";
import type { CheckoutPaymentMethod, MealCardBrandId, TenantPaymentFlags } from "@/lib/tenant-payment";
import { isMealCardBrandAllowed, isPaymentMethodEnabled } from "@/lib/tenant-payment";

function isOpenDeliveryOrder(order: AdminOrder): boolean {
  if (order.status === "completed" || order.status === "cancelled") return false;
  if (order.deliveryStatus === "delivered" || order.deliveryStatus === "cancelled") return false;
  return true;
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

export async function loadActiveCouriers(
  tenantId: string,
): Promise<{ ok: true; couriers: CourierRow[] } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("couriers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, couriers: (data ?? []) as CourierRow[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kurye listesi yüklenemedi." };
  }
}

export async function loadKasaDeliveryOrders(
  tenantId: string,
): Promise<{ ok: true; orders: AdminOrder[] } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { data: rows, error } = await svc
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fulfillment_type", "delivery")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return { ok: false, error: error.message };
    }

    const orderRows = ((rows ?? []) as OrderRow[]).filter(
      (row) =>
        row.status !== "completed" &&
        row.status !== "cancelled" &&
        row.delivery_status !== "delivered" &&
        row.delivery_status !== "cancelled",
    );

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

    const orders = await enrichDeliveryOrdersWithCouriers(
      tenantId,
      buildAdminOrders(orderRows, (lineRows ?? []) as OrderLineRow[]),
    );
    orders.sort(compareKitchenUrgency);
    return { ok: true, orders };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Paket siparişleri yüklenemedi." };
  }
}

/** Son kapanan paket siparişleri (kasa geçmişi). */
export async function loadKasaClosedDeliveryOrders(
  tenantId: string,
  limit = 60,
): Promise<{ ok: true; orders: AdminOrder[] } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { data: rows, error } = await svc
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fulfillment_type", "delivery")
      .or("status.eq.completed,delivery_status.eq.delivered")
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { ok: false, error: error.message };
    }

    const orderRows = ((rows ?? []) as OrderRow[]).filter(
      (row) => row.status === "completed" || row.delivery_status === "delivered",
    );

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

    return {
      ok: true,
      orders: await enrichDeliveryOrdersWithCouriers(
        tenantId,
        buildAdminOrders(orderRows, (lineRows ?? []) as OrderLineRow[]),
      ),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Geçmiş yüklenemedi." };
  }
}

async function enrichDeliveryOrdersWithCouriers(
  tenantId: string,
  orders: AdminOrder[],
): Promise<AdminOrder[]> {
  const courierIds = Array.from(
    new Set(orders.map((o) => o.courierId).filter((id): id is string => Boolean(id))),
  );
  if (courierIds.length === 0) return orders;

  try {
    const svc = createServiceSupabaseClient();
    const { data } = await svc
      .from("couriers")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("id", courierIds);

    const byId = new Map<string, string>();
    for (const c of (data ?? []) as CourierRow[]) {
      byId.set(c.id, courierDisplayName(c));
    }

    return orders.map((o) => ({
      ...o,
      courierName: o.courierId ? byId.get(o.courierId) ?? o.courierName ?? null : null,
    }));
  } catch {
    return orders;
  }
}

export async function loadKasaDeliveryOrderDetail(
  tenantId: string,
  orderId: string,
): Promise<
  | { ok: true; order: AdminOrder; couriers: CourierRow[]; open: true; courierName: string | null }
  | { ok: false; error: string }
> {
  if (!orderId) {
    return { ok: false, error: "Geçersiz sipariş." };
  }

  try {
    const order = await loadOrderWithLines(tenantId, orderId);
    if (!order) {
      return { ok: false, error: "Sipariş bulunamadı." };
    }
    if (order.fulfillmentType !== "delivery") {
      return { ok: false, error: "Bu sipariş paket değil." };
    }
    if (!isOpenDeliveryOrder(order)) {
      return { ok: false, error: "Sipariş zaten kapatılmış." };
    }

    const svc = createServiceSupabaseClient();
    await markOrderSeenIfNeeded(svc, tenantId, orderId);
    const refreshed = (await loadOrderWithLines(tenantId, orderId)) ?? order;

    const couriersResult = await loadActiveCouriers(tenantId);
    if (!couriersResult.ok) {
      return couriersResult;
    }

    const [enriched] = await enrichDeliveryOrdersWithCouriers(tenantId, [refreshed]);
    return {
      ok: true,
      order: enriched ?? refreshed,
      couriers: couriersResult.couriers,
      open: true,
      courierName: enriched?.courierName ?? null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sipariş yüklenemedi." };
  }
}

/** Kapanmış paket siparişi — salt okunur geçmiş. */
export async function loadKasaDeliveryOrderHistoryDetail(
  tenantId: string,
  orderId: string,
): Promise<
  | { ok: true; order: AdminOrder; couriers: CourierRow[]; open: false; courierName: string | null }
  | { ok: false; error: string }
> {
  if (!orderId) {
    return { ok: false, error: "Geçersiz sipariş." };
  }

  try {
    const order = await loadOrderWithLines(tenantId, orderId);
    if (!order) {
      return { ok: false, error: "Sipariş bulunamadı." };
    }
    if (order.fulfillmentType !== "delivery") {
      return { ok: false, error: "Bu sipariş paket değil." };
    }
    if (isOpenDeliveryOrder(order)) {
      return { ok: false, error: "Sipariş hâlâ açık; aktif listeden açın." };
    }

    const [enriched] = await enrichDeliveryOrdersWithCouriers(tenantId, [order]);
    return {
      ok: true,
      order: enriched ?? order,
      couriers: [],
      open: false,
      courierName: enriched?.courierName ?? null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sipariş yüklenemedi." };
  }
}

export async function assignCourierToDeliveryOrder(input: {
  tenantId: string;
  orderId: string;
  courierId: string;
}): Promise<{ ok: true; courierName: string } | { ok: false; error: string }> {
  const detail = await loadKasaDeliveryOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data: courier, error: courierErr } = await svc
      .from("couriers")
      .select("id, first_name, last_name, is_active")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.courierId)
      .maybeSingle();

    if (courierErr || !courier || courier.is_active !== true) {
      return { ok: false, error: "Geçersiz kurye." };
    }

    const { error } = await svc
      .from("orders")
      .update({ courier_id: input.courierId })
      .eq("id", input.orderId)
      .eq("tenant_id", input.tenantId)
      .eq("fulfillment_type", "delivery");

    if (error) {
      return { ok: false, error: error.message };
    }

    const courierName = courierDisplayName(courier as CourierRow);

    await writeActivityLog({
      tenant_id: input.tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "courier_assigned",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        courier: courierName,
        courier_id: input.courierId,
        fulfillment_type: "delivery",
      },
    });

    return { ok: true, courierName };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kurye atanamadı." };
  }
}

export async function updateDeliveryOrderStatus(input: {
  tenantId: string;
  orderId: string;
  deliveryStatus: DeliveryStatus;
  cancelReason?: unknown;
  cancelNote?: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed: DeliveryStatus[] = [
    "pending",
    "preparing",
    "ready_for_dispatch",
    "out_for_delivery",
    "cancelled",
  ];
  if (!allowed.includes(input.deliveryStatus)) {
    return { ok: false, error: "Geçersiz teslimat durumu." };
  }

  if (input.deliveryStatus === "cancelled") {
    const svc = createServiceSupabaseClient();
    return cancelKitchenOrder(svc, {
      tenantId: input.tenantId,
      orderId: input.orderId,
      reason: input.cancelReason,
      note: input.cancelNote,
      actorType: "cashier",
      actorLabel: "Kasa",
      panel: "kasa-delivery",
    });
  }

  const detail = await loadKasaDeliveryOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  try {
    const svc = createServiceSupabaseClient();
    const orderUpdate: Record<string, unknown> = {
      delivery_status: input.deliveryStatus,
    };
    if (!detail.order.seenAt) {
      orderUpdate.seen_at = new Date().toISOString();
    }

    const { error } = await svc
      .from("orders")
      .update(orderUpdate)
      .eq("id", input.orderId)
      .eq("tenant_id", input.tenantId)
      .eq("fulfillment_type", "delivery");

    if (error) {
      return { ok: false, error: error.message };
    }

    await writeActivityLog({
      tenant_id: input.tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "delivery_status_updated",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        from: detail.order.deliveryStatus,
        to: input.deliveryStatus,
        fulfillment_type: "delivery",
      },
    });

    try {
      const { data: orderRow } = await svc
        .from("orders")
        .select("customer_user_id, order_code, tenants ( business_name, subdomain )")
        .eq("id", input.orderId)
        .maybeSingle();
      const customerUserId =
        orderRow && typeof (orderRow as { customer_user_id?: unknown }).customer_user_id === "string"
          ? ((orderRow as { customer_user_id: string }).customer_user_id)
          : null;
      if (customerUserId) {
        const { stageFromDeliveryStatus } = await import("@/lib/musteri/order-tracking");
        const stage = stageFromDeliveryStatus(input.deliveryStatus);
        if (stage) {
          const tenantsRaw = (orderRow as { tenants?: unknown }).tenants;
          const tenant = Array.isArray(tenantsRaw) ? tenantsRaw[0] : tenantsRaw;
          const t = tenant as { business_name?: string; subdomain?: string } | null;
          const { notifyCustomerOrderStage } = await import("@/lib/musteri/notifications-service");
          await notifyCustomerOrderStage({
            userId: customerUserId,
            orderId: input.orderId,
            orderCode: detail.order.orderCode,
            subdomain: t?.subdomain ?? "",
            restaurantName: t?.business_name ?? "Restoran",
            stage,
          });
        }
      }
    } catch {
      /* müşteri bildirimi opsiyonel */
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Durum güncellenemedi." };
  }
}

export async function closeDeliveryOrderWithPayment(input: {
  tenantId: string;
  orderId: string;
  courierId: string;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  paymentFlags: TenantPaymentFlags;
}): Promise<
  { ok: true; orderCode: string; total: number; paidAt: string; courierId: string } | { ok: false; error: string }
> {
  const detail = await loadKasaDeliveryOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  const currentStatus = detail.order.deliveryStatus ?? "pending";
  if (currentStatus === "delivered" || currentStatus === "cancelled") {
    return { ok: false, error: "Bu sipariş zaten kapatılmış veya iptal." };
  }

  const courierId = input.courierId.trim();
  if (!courierId) {
    return { ok: false, error: "Teslim eden kuryeyi seçin." };
  }
  const courierOk = detail.couriers.some((c) => c.id === courierId);
  if (!courierOk) {
    return { ok: false, error: "Geçersiz kurye." };
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
      delivery_status: "delivered",
      courier_id: courierId,
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
      .eq("fulfillment_type", "delivery");

    if (error) {
      return { ok: false, error: error.message };
    }

    const courier = detail.couriers.find((c) => c.id === courierId);

    await writeActivityLog({
      tenant_id: input.tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "delivery_completed",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        fulfillment_type: "delivery",
        total: detail.order.total,
        courier_id: courierId,
        courier_name: courier ? courierDisplayName(courier) : null,
        paid_at: paidAt,
      },
    });

    await writeActivityLog({
      tenant_id: input.tenantId,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "payment_closed",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        fulfillment_type: "delivery",
        method: input.paymentMethod,
        meal_card: input.paymentMethod === "meal_card" ? input.mealCardBrandId : null,
        total: detail.order.total,
        courier_id: courierId,
        paid_at: paidAt,
      },
    });

    return {
      ok: true,
      orderCode: detail.order.orderCode,
      total: detail.order.total,
      paidAt,
      courierId,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ödeme kaydedilemedi." };
  }
}
