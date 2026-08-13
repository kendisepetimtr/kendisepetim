import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import {
  ORDER_TRACK_STAGE_LABELS,
  ORDER_TRACK_STAGE_MESSAGES,
  buildAutoNotificationPlan,
  parseOrderEtaFromTenant,
  type OrderTrackStage,
} from "@/lib/musteri/order-tracking";

export type CustomerOrderNotification = {
  id: string;
  createdAt: string;
  orderId: string | null;
  orderCode: string;
  subdomain: string;
  restaurantName: string;
  title: string;
  body: string;
  stage: OrderTrackStage;
  source: string;
  deliveredAt: string | null;
  readAt: string | null;
};

function mapRow(row: Record<string, unknown>): CustomerOrderNotification {
  const stage = (typeof row.stage === "string" ? row.stage : "received") as OrderTrackStage;
  return {
    id: String(row.id ?? ""),
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    orderId: typeof row.order_id === "string" ? row.order_id : null,
    orderCode: typeof row.order_code === "string" ? row.order_code : "",
    subdomain: typeof row.subdomain === "string" ? row.subdomain : "",
    restaurantName: typeof row.restaurant_name === "string" ? row.restaurant_name : "",
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    stage: stage in ORDER_TRACK_STAGE_LABELS ? stage : "received",
    source: typeof row.source === "string" ? row.source : "system",
    deliveredAt: typeof row.delivered_at === "string" ? row.delivered_at : null,
    readAt: typeof row.read_at === "string" ? row.read_at : null,
  };
}

export async function insertCustomerNotification(input: {
  userId: string;
  orderId?: string | null;
  orderCode: string;
  subdomain: string;
  restaurantName: string;
  stage: OrderTrackStage;
  source?: "manual" | "auto" | "system";
  scheduledAt?: string | null;
  deliverNow?: boolean;
}): Promise<void> {
  try {
    const svc = createServiceSupabaseClient();
    const now = new Date().toISOString();
    const deliverNow = input.deliverNow !== false && !input.scheduledAt;
    await svc.from("customer_order_notifications").insert({
      user_id: input.userId,
      order_id: input.orderId ?? null,
      order_code: input.orderCode,
      subdomain: input.subdomain,
      restaurant_name: input.restaurantName,
      title: ORDER_TRACK_STAGE_LABELS[input.stage],
      body: ORDER_TRACK_STAGE_MESSAGES[input.stage],
      stage: input.stage,
      source: input.source ?? "system",
      scheduled_at: input.scheduledAt ?? null,
      delivered_at: deliverNow ? now : null,
    });
  } catch {
    /* bildirim tablosu yoksa sessiz */
  }
}

export async function scheduleAutoNotificationsForOrder(input: {
  userId: string;
  orderId: string;
  orderCode: string;
  subdomain: string;
  restaurantName: string;
  fulfillmentIsDelivery: boolean;
  tenantRow: Record<string, unknown>;
  createdAt?: Date;
}): Promise<void> {
  const eta = parseOrderEtaFromTenant(input.tenantRow);
  const plan = buildAutoNotificationPlan(eta, input.fulfillmentIsDelivery);
  if (plan.length === 0) {
    await insertCustomerNotification({
      userId: input.userId,
      orderId: input.orderId,
      orderCode: input.orderCode,
      subdomain: input.subdomain,
      restaurantName: input.restaurantName,
      stage: "received",
      source: "system",
      deliverNow: true,
    });
    return;
  }

  const base = input.createdAt ?? new Date();
  for (const step of plan) {
    const at = new Date(base.getTime() + step.offsetMinutes * 60_000);
    const immediate = step.offsetMinutes <= 0;
    await insertCustomerNotification({
      userId: input.userId,
      orderId: input.orderId,
      orderCode: input.orderCode,
      subdomain: input.subdomain,
      restaurantName: input.restaurantName,
      stage: step.stage,
      source: immediate ? "system" : "auto",
      scheduledAt: immediate ? null : at.toISOString(),
      deliverNow: immediate,
    });
  }
}

export async function notifyCustomerOrderStage(input: {
  userId: string;
  orderId: string;
  orderCode: string;
  subdomain: string;
  restaurantName: string;
  stage: OrderTrackStage;
}): Promise<void> {
  await insertCustomerNotification({
    ...input,
    source: "manual",
    deliverNow: true,
  });
}

export async function loadCustomerNotifications(
  userId: string,
  limit = 40,
): Promise<CustomerOrderNotification[]> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_order_notifications")
      .select(
        "id, created_at, order_id, order_code, subdomain, restaurant_name, title, body, stage, source, delivered_at, read_at",
      )
      .eq("user_id", userId)
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function markCustomerNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  try {
    const svc = createServiceSupabaseClient();
    const now = new Date().toISOString();
    let q = svc
      .from("customer_order_notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null)
      .not("delivered_at", "is", null);
    if (ids?.length) q = q.in("id", ids);
    await q;
  } catch {
    /* ignore */
  }
}

/** Zamanı gelen otomatik bildirimleri teslim et (müşteri paneli poll / açılış). */
export async function deliverDueCustomerNotifications(userId?: string): Promise<number> {
  try {
    const svc = createServiceSupabaseClient();
    const now = new Date().toISOString();
    let q = svc
      .from("customer_order_notifications")
      .update({ delivered_at: now })
      .is("delivered_at", null)
      .lte("scheduled_at", now);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q.select("id");
    if (error || !data) return 0;
    return data.length;
  } catch {
    return 0;
  }
}
