import { writeActivityLog } from "@/lib/activity-log";
import { buildAdminOrders } from "@/lib/order-map";
import type { DeliveryStatus } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";
import type { CheckoutPaymentMethod, MealCardBrandId, TenantPaymentFlags } from "@/lib/tenant-payment";

function isPaymentMethodEnabled(flags: TenantPaymentFlags, method: CheckoutPaymentMethod): boolean {
  if (method === "cash") return flags.paymentCash;
  if (method === "door_card") return flags.paymentDoorCard;
  return flags.paymentMealCard;
}

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

    return { ok: true, orders: buildAdminOrders(orderRows, (lineRows ?? []) as OrderLineRow[]) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Paket siparişleri yüklenemedi." };
  }
}

export async function loadKasaDeliveryOrderDetail(
  tenantId: string,
  orderId: string,
): Promise<
  | { ok: true; order: AdminOrder; couriers: CourierRow[] }
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

    const couriersResult = await loadActiveCouriers(tenantId);
    if (!couriersResult.ok) {
      return couriersResult;
    }

    return { ok: true, order, couriers: couriersResult.couriers };
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

  const detail = await loadKasaDeliveryOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  try {
    const svc = createServiceSupabaseClient();
    const orderUpdate: Record<string, unknown> = {
      delivery_status: input.deliveryStatus,
    };
    if (input.deliveryStatus === "cancelled") {
      orderUpdate.status = "cancelled";
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
      action: input.deliveryStatus === "cancelled" ? "order_cancelled" : "delivery_status_updated",
      entity_type: "order",
      entity_id: input.orderId,
      order_code: detail.order.orderCode,
      metadata: {
        from: detail.order.deliveryStatus,
        to: input.deliveryStatus,
        fulfillment_type: "delivery",
      },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Durum güncellenemedi." };
  }
}

export async function closeDeliveryOrderWithPayment(input: {
  tenantId: string;
  orderId: string;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  paymentFlags: TenantPaymentFlags;
}): Promise<{ ok: true; orderCode: string; total: number } | { ok: false; error: string }> {
  const detail = await loadKasaDeliveryOrderDetail(input.tenantId, input.orderId);
  if (!detail.ok) {
    return detail;
  }

  const currentStatus = detail.order.deliveryStatus ?? "pending";
  if (currentStatus !== "out_for_delivery" && currentStatus !== "ready_for_dispatch") {
    return { ok: false, error: "Ödeme için sipariş «Yolda» veya «Kuryeye hazır» olmalıdır." };
  }

  if (!isPaymentMethodEnabled(input.paymentFlags, input.paymentMethod)) {
    return { ok: false, error: "Bu ödeme yöntemi aktif değil." };
  }
  if (input.paymentMethod === "meal_card") {
    const brand = input.mealCardBrandId;
    if (brand !== "multinet" && brand !== "sodexo" && brand !== "edenred") {
      return { ok: false, error: "Yemek kartı türü seçilmelidir." };
    }
  }

  try {
    const svc = createServiceSupabaseClient();
    const orderUpdate: Record<string, unknown> = {
      status: "completed",
      delivery_status: "delivered",
      payment_method_at_close: input.paymentMethod,
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
      },
    });

    return {
      ok: true,
      orderCode: detail.order.orderCode,
      total: detail.order.total,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ödeme kaydedilemedi." };
  }
}
