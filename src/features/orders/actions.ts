"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import {
  effectiveOnlinePrice,
  type CartItem,
  type OrderChannel,
  type Order,
  type OrderDetail,
  type OrderItem,
  type OrderStatus,
  type OrderType,
} from "../../types";
import { getCurrentRestaurantContext, getRestaurantBySlug } from "../tenants";
import { DELIVERY_FEE_TRY, orderRequiresCourierOnClose } from "./constants";

type PaymentMethod = "cash" | "card";
const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

function isUnknownColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes("could not find") && m.includes("column")) ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

/** closed_at / patch öncesi DB veya PostgREST boş mesaj döndüğünde eski sorguya geç. */
function shouldUseOrdersClosedAtFallback(error: {
  message?: string;
  details?: string;
  code?: string;
}): boolean {
  const msg = String(error.message ?? "").trim();
  const details = String(error.details ?? "").trim();
  const blob = `${msg} ${details}`.toLowerCase();
  if (error.code === "42703") return true;
  if (isUnknownColumnError(msg) || isUnknownColumnError(details)) return true;
  if (blob.includes("closed_at") && (blob.includes("does not exist") || blob.includes("unknown column"))) {
    return true;
  }
  // Bazı PostgREST / ağ yanıtlarında message boş kalabiliyor; count sorgusunda güvenli geri dönüş.
  if (!msg && !details) return true;
  return false;
}

type CreateOrderInput = {
  tenantSlug: string;
  orderType: OrderType;
  orderChannel?: OrderChannel;
  initialStatus?: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  tableNumber?: string;
  orderNote?: string;
  cartItems: CartItem[];
};

type CreateOrderResult = {
  ok: true;
  orderId: string;
  total: number;
};

function asText(value: string | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function validateOrderType(value: string): value is OrderType {
  return value === "table" || value === "delivery" || value === "pickup";
}

function validatePaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "card";
}

function validateOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

async function upsertCustomerForRestaurant(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  restaurantId: string,
  customerName: string,
  customerPhone: string,
  deliveryAddress: string | null,
): Promise<string | null> {
  const payload = {
    restaurant_id: restaurantId,
    full_name: customerName,
    phone: customerPhone,
    delivery_address: deliveryAddress,
  };
  const upsert = await supabase
    .from("customers")
    .upsert(payload, { onConflict: "restaurant_id,phone" })
    .select("id")
    .single<{ id: string }>();

  if (!upsert.error && upsert.data?.id) {
    return upsert.data.id;
  }
  if (upsert.error && shouldUseOrdersClosedAtFallback(upsert.error)) {
    // customers tablosu henüz yoksa sipariş akışını bozmayalım.
    return null;
  }
  if (upsert.error) {
    throw new Error(`Failed to upsert customer: ${upsert.error.message}`);
  }
  return null;
}

export async function createOrderFromCheckout(input: CreateOrderInput): Promise<CreateOrderResult> {
  const orderType = String(input.orderType ?? "");
  const orderChannel: OrderChannel =
    input.orderChannel ??
    (orderType === "table" ? "table" : "online");
  const paymentMethod = String(input.paymentMethod ?? "");
  const initialStatus: OrderStatus = input.initialStatus ?? (orderChannel === "table" ? "confirmed" : "pending");

  if (!validateOrderType(orderType)) {
    throw new Error("Invalid order type.");
  }
  if (!validatePaymentMethod(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  const customerName = asText(input.customerName);
  const customerPhone = asText(input.customerPhone);
  const deliveryAddress = asText(input.deliveryAddress);
  const tableNumber = asText(input.tableNumber);
  const orderNote = asText(input.orderNote);

  if (!customerName || !customerPhone) {
    throw new Error("Customer name and phone are required.");
  }
  if (orderType === "delivery" && orderChannel !== "package" && !deliveryAddress) {
    throw new Error("Delivery address is required for delivery orders.");
  }
  if (orderType === "table" && !tableNumber) {
    throw new Error("Table number is required for table orders.");
  }

  const cartItems = Array.isArray(input.cartItems) ? input.cartItems : [];
  if (cartItems.length === 0) {
    throw new Error("Cart is empty.");
  }

  const normalizedItems = cartItems
    .map((item) => ({
      productId: String(item.productId ?? "").trim(),
      quantity: Number(item.quantity),
      removedIngredients: Array.isArray(item.removedIngredients)
        ? item.removedIngredients.filter((v): v is string => typeof v === "string")
        : [],
      addedIngredients: Array.isArray(item.addedIngredients)
        ? item.addedIngredients.filter((v): v is string => typeof v === "string")
        : [],
      itemNote: asText(item.itemNote ?? undefined),
    }))
    .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({ ...item, quantity: Math.floor(item.quantity) }));

  if (normalizedItems.length === 0) {
    throw new Error("Cart contains invalid items.");
  }

  const restaurant = await getRestaurantBySlug(input.tenantSlug, { storefront: true });
  if (!restaurant) {
    throw new Error("Restaurant not found for tenant.");
  }

  const supabase = await createServerSupabaseClient();
  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("restaurant_id", restaurant.id);

  if (productError) {
    throw new Error(`Failed to validate products: ${productError.message}`);
  }

  if (!products || products.length !== productIds.length) {
    throw new Error("Some products are invalid for this restaurant.");
  }

  const productMap = new Map(products.map((product) => [product.id as string, product]));

  const orderItems = normalizedItems.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Product validation failed.");
    }
    if (!product.is_active) {
      throw new Error("Cart includes inactive products.");
    }

    const row = product as {
      price: unknown;
      delivery_price?: unknown;
      use_delivery_price?: unknown;
    };
    const basePrice = Number(row.price);
    const deliveryPrice =
      row.delivery_price != null && row.delivery_price !== ""
        ? Number(row.delivery_price)
        : null;
    const useDeliveryPrice = Boolean(row.use_delivery_price);
    const unitPrice =
      orderChannel === "package" && useDeliveryPrice && deliveryPrice != null
        ? Number(deliveryPrice.toFixed(2))
        : effectiveOnlinePrice({
            price: basePrice,
            delivery_price: deliveryPrice,
            use_delivery_price: useDeliveryPrice,
          });
    const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

    return {
      product_id: product.id,
      product_name_snapshot: product.name,
      unit_price: Number(unitPrice.toFixed(2)),
      quantity: item.quantity,
      line_total: lineTotal,
      removed_ingredients: item.removedIngredients,
      added_ingredients: item.addedIngredients,
      item_note: item.itemNote,
    };
  });

  const subtotal = Number(
    orderItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2),
  );
  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE_TRY : 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const shouldPersistCustomer = orderChannel === "online" || orderChannel === "package";
  const customerId = shouldPersistCustomer
    ? await upsertCustomerForRestaurant(supabase, restaurant.id, customerName, customerPhone, deliveryAddress)
    : null;

  const baseOrderPayload: Record<string, unknown> = {
    restaurant_id: restaurant.id,
    order_type: orderType,
    order_channel: orderChannel,
    payment_method: paymentMethod,
    status: initialStatus,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    customer_name: customerName,
    customer_phone: customerPhone,
    table_number: tableNumber,
    delivery_address: deliveryAddress,
    note: orderNote,
  };
  if (customerId) baseOrderPayload.customer_id = customerId;

  let { data: insertedOrder, error: orderError } = await supabase
    .from("orders")
    .insert(baseOrderPayload)
    .select("id")
    .single<{ id: string }>();

  if (orderError && shouldUseOrdersClosedAtFallback(orderError) && "customer_id" in baseOrderPayload) {
    const retryPayload = { ...baseOrderPayload };
    delete retryPayload.customer_id;
    const retry = await supabase
      .from("orders")
      .insert(retryPayload)
      .select("id")
      .single<{ id: string }>();
    insertedOrder = retry.data;
    orderError = retry.error;
  }

  if (orderError || !insertedOrder) {
    throw new Error(`Failed to create order: ${orderError?.message ?? "Unknown error"}`);
  }

  let { error: itemError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: insertedOrder.id,
      restaurant_id: restaurant.id,
      ...item,
    })),
  );

  if (itemError && isUnknownColumnError(itemError.message)) {
    const legacyInsert = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: insertedOrder.id,
        restaurant_id: restaurant.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
    );
    itemError = legacyInsert.error;
  }

  if (itemError) {
    await supabase.from("orders").delete().eq("id", insertedOrder.id);
    throw new Error(`Failed to create order items: ${itemError.message}`);
  }

  revalidatePath("/dashboard/orders");

  return {
    ok: true,
    orderId: insertedOrder.id,
    total,
  };
}

/** Garson paneli: masa siparişi (müşteri bilgisi yer tutucu). */
export async function createWaiterTableOrder(input: {
  tenantSlug: string;
  tableNumber: string;
  cartItems: CartItem[];
  orderNote?: string;
}): Promise<CreateOrderResult> {
  const table = String(input.tableNumber ?? "").trim();
  if (!table) {
    throw new Error("Masa numarası gerekli.");
  }
  return createOrderFromCheckout({
    tenantSlug: input.tenantSlug,
    orderType: "table",
    orderChannel: "table",
    paymentMethod: "cash",
    customerName: `Masa ${table} (Garson)`,
    customerPhone: "0000000000",
    tableNumber: table,
    orderNote: input.orderNote,
    cartItems: input.cartItems,
  });
}

export async function createCashierTableOrder(input: {
  tableNumber: string;
  cartItems: CartItem[];
  orderNote?: string;
}): Promise<CreateOrderResult> {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");
  const table = String(input.tableNumber ?? "").trim();
  if (!table) throw new Error("Masa numarası gerekli.");
  return createOrderFromCheckout({
    tenantSlug: context.restaurant.slug,
    orderType: "table",
    orderChannel: "table",
    paymentMethod: "cash",
    customerName: `Masa ${table} (Kasa)`,
    customerPhone: "0000000000",
    tableNumber: table,
    orderNote: input.orderNote,
    cartItems: input.cartItems,
  });
}

export async function createCashierPackageOrder(input: {
  cartItems: CartItem[];
  orderNote?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
}): Promise<CreateOrderResult> {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");
  return createOrderFromCheckout({
    tenantSlug: context.restaurant.slug,
    orderType: "delivery",
    orderChannel: "package",
    paymentMethod: "cash",
    customerName: String(input.customerName ?? "").trim(),
    customerPhone: String(input.customerPhone ?? "").trim(),
    deliveryAddress: String(input.deliveryAddress ?? "").trim() || undefined,
    orderNote: input.orderNote,
    initialStatus: "confirmed",
    cartItems: input.cartItems,
  });
}

export type DashboardOrdersQueryOptions = {
  tableNumber?: string;
  /** open: kasiyer kapatmamış; closed: geçmiş */
  list?: "open" | "closed";
};

const ORDER_LIST_SELECT =
  "id, order_number, restaurant_id, order_type, order_channel, payment_method, status, customer_name, table_number, total, created_at, closed_at, courier_id, table_session_id, couriers ( first_name, last_name )";

function normalizeDashboardOrderRow(row: Record<string, unknown>): Order {
  const r = row as Partial<Order> & { order_type: OrderType };
  const oc = r.order_channel;
  const order_channel: OrderChannel =
    oc === "package" || oc === "table" || oc === "online"
      ? oc
      : r.order_type === "table"
        ? "table"
        : "online";
  return {
    id: r.id as string,
    order_number: r.order_number ?? null,
    restaurant_id: r.restaurant_id as string,
    order_type: r.order_type,
    order_channel,
    payment_method: r.payment_method as Order["payment_method"],
    status: r.status as OrderStatus,
    customer_name: r.customer_name ?? null,
    table_number: r.table_number ?? null,
    total: Number(r.total),
    created_at: r.created_at as string,
    closed_at: r.closed_at ?? null,
    courier_id: r.courier_id ?? null,
    table_session_id: r.table_session_id ?? null,
    couriers: r.couriers ?? null,
  };
}

export async function getDashboardOrdersForCurrentRestaurant(
  channel?: OrderChannel | "all",
  options?: DashboardOrdersQueryOptions,
): Promise<Order[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const tableFilter = String(options?.tableNumber ?? "").trim();
  const listMode = options?.list ?? "open";

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("orders").select(ORDER_LIST_SELECT).eq("restaurant_id", context.restaurant.id);

  if (channel && channel !== "all") {
    query = query.eq("order_channel", channel);
  }
  if (tableFilter) {
    query = query.eq("table_number", tableFilter);
  }
  if (listMode === "open") {
    query = query.is("closed_at", null).neq("status", "cancelled");
  } else {
    query = query.not("closed_at", "is", null);
  }

  let { data, error } = await query.order("created_at", { ascending: false }).limit(150).returns<Order[]>();

  if (error && shouldUseOrdersClosedAtFallback(error)) {
    let legacyQuery = supabase
      .from("orders")
      .select(
        "id, order_number, restaurant_id, order_type, payment_method, status, customer_name, table_number, total, created_at",
      )
      .eq("restaurant_id", context.restaurant.id);
    if (channel && channel !== "all") {
      if (channel === "table") legacyQuery = legacyQuery.eq("order_type", "table");
      else if (channel === "online") legacyQuery = legacyQuery.in("order_type", ["delivery", "pickup"]);
      else legacyQuery = legacyQuery.eq("id", "__no_package_before_patch__");
    }
    if (tableFilter) {
      legacyQuery = legacyQuery.eq("table_number", tableFilter);
    }
    const legacyFirst = await legacyQuery.order("created_at", { ascending: false }).limit(150);
    let legacyResolved: typeof legacyFirst = legacyFirst;
    if (legacyFirst.error && isUnknownColumnError(legacyFirst.error.message)) {
      let legacyQueryMinimal = supabase
        .from("orders")
        .select("id, order_number, restaurant_id, order_type, payment_method, status, customer_name, total, created_at")
        .eq("restaurant_id", context.restaurant.id);
      if (channel && channel !== "all") {
        if (channel === "table") legacyQueryMinimal = legacyQueryMinimal.eq("order_type", "table");
        else if (channel === "online") legacyQueryMinimal = legacyQueryMinimal.in("order_type", ["delivery", "pickup"]);
        else legacyQueryMinimal = legacyQueryMinimal.eq("id", "__no_package_before_patch__");
      }
      legacyResolved = (await legacyQueryMinimal.order("created_at", { ascending: false }).limit(150)) as typeof legacyFirst;
    }
    error = legacyResolved.error;
    if (error) {
      throw new Error(`Failed to fetch dashboard orders: ${error.message}`);
    }
    const raw = (legacyResolved.data ?? []).map((r) => {
      const row = r as typeof r & { table_number?: string | null };
      return normalizeDashboardOrderRow({
        ...r,
        order_channel: r.order_type === "table" ? "table" : "online",
        order_type: r.order_type,
        table_number: row.table_number ?? null,
        closed_at: null,
        courier_id: null,
        table_session_id: null,
        couriers: null,
      });
    });
    const legacyList =
      listMode === "open"
        ? raw.filter((o) => o.status !== "cancelled" && o.status !== "delivered")
        : raw.filter((o) => o.status === "cancelled" || o.status === "delivered");
    return legacyList.map((row) => normalizeDashboardOrderRow(row as Record<string, unknown>));
  }

  if (error) {
    throw new Error(`Failed to fetch dashboard orders: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeDashboardOrderRow(row as Record<string, unknown>));
}

export async function getPendingOnlineOrdersCountForCurrentRestaurant(): Promise<number> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_channel", "online")
    .is("closed_at", null)
    .eq("status", "pending");

  if (error && shouldUseOrdersClosedAtFallback(error)) {
    const legacy = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", context.restaurant.id)
      .in("order_type", ["delivery", "pickup"])
      .eq("status", "pending");
    if (legacy.error) {
      throw new Error(
        `Failed to fetch pending online orders: ${legacy.error.message || legacy.error.details || "unknown"}`,
      );
    }
    return legacy.count ?? 0;
  }

  if (error) {
    throw new Error(
      `Failed to fetch pending online orders: ${error.message || error.details || error.code || "unknown"}`,
    );
  }
  return count ?? 0;
}

export async function getPendingTableOrdersCountForCurrentRestaurant(): Promise<number> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_channel", "table")
    .is("closed_at", null)
    .eq("status", "confirmed");

  if (error && shouldUseOrdersClosedAtFallback(error)) {
    const legacy = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", context.restaurant.id)
      .eq("order_type", "table")
      .eq("status", "pending");
    if (legacy.error) {
      throw new Error(
        `Failed to fetch pending table orders: ${legacy.error.message || legacy.error.details || "unknown"}`,
      );
    }
    return legacy.count ?? 0;
  }

  if (error) {
    throw new Error(
      `Failed to fetch pending table orders: ${error.message || error.details || error.code || "unknown"}`,
    );
  }
  return count ?? 0;
}

export async function getPendingPackageOrdersCountForCurrentRestaurant(): Promise<number> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_channel", "package")
    .is("closed_at", null)
    .eq("status", "confirmed");

  if (error && shouldUseOrdersClosedAtFallback(error)) {
    // Eski şemada package ayrımı yoktu.
    return 0;
  }
  if (error) {
    throw new Error(
      `Failed to fetch pending package orders: ${error.message || error.details || error.code || "unknown"}`,
    );
  }
  return count ?? 0;
}

/** Masa numarası -> bekleyen (pending) masa siparişi adedi */
export async function getPendingTableOrderCountsByTableForCurrentRestaurant(): Promise<
  Record<string, number>
> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  let { data, error } = await supabase
    .from("orders")
    .select("table_number")
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_channel", "table")
    .is("closed_at", null)
    .neq("status", "cancelled");

  if (error && shouldUseOrdersClosedAtFallback(error)) {
    const legacy = await supabase
      .from("orders")
      .select("table_number")
      .eq("restaurant_id", context.restaurant.id)
      .eq("order_type", "table")
      .eq("status", "pending");
    error = legacy.error;
    data = legacy.data as typeof data;
  }

  if (error) {
    throw new Error(
      `Failed to fetch table order counts: ${error.message || error.details || error.code || "unknown"}`,
    );
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const t = String((row as { table_number?: string | null }).table_number ?? "").trim();
    if (!t) continue;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

export async function updateOrderStatus(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orderId = String(formData.get("order_id") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!orderId || !validateOrderStatus(nextStatus)) {
    throw new Error("Invalid order update payload.");
  }

  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "cancelled") {
    patch.closed_at = new Date().toISOString();
    if (user?.id) patch.closed_by_user_id = user.id;
  }

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("restaurant_id", context.restaurant.id);

  if (error && isUnknownColumnError(error.message)) {
    const { error: e2 } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId)
      .eq("restaurant_id", context.restaurant.id);
    if (e2) {
      throw new Error(`Failed to update order status: ${e2.message}`);
    }
  } else if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function markOrderPreparing(orderId: string) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const normalizedOrderId = String(orderId ?? "").trim();
  if (!normalizedOrderId) throw new Error("Sipariş bulunamadı.");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "preparing" })
    .eq("id", normalizedOrderId)
    .eq("restaurant_id", context.restaurant.id)
    .is("closed_at", null);

  if (error && isUnknownColumnError(error.message)) {
    const retry = await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", normalizedOrderId)
      .eq("restaurant_id", context.restaurant.id);
    if (retry.error) throw new Error(`Sipariş hazırlanamadı: ${retry.error.message}`);
  } else if (error) {
    throw new Error(`Sipariş hazırlanamadı: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${normalizedOrderId}`);
}

export async function closeOrder(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum gerekli.");
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  const courierIdRaw = String(formData.get("courier_id") ?? "").trim();
  const courierId = courierIdRaw.length > 0 ? courierIdRaw : null;

  if (!orderId) {
    throw new Error("Sipariş bulunamadı.");
  }

  const order = await getDashboardOrderById(orderId);
  if (!order) {
    throw new Error("Sipariş bulunamadı.");
  }

  if (order.restaurant_id !== context.restaurant.id) {
    throw new Error("Yetkisiz.");
  }

  if (order.closed_at) {
    throw new Error("Sipariş zaten kapatılmış.");
  }

  const needCourier = orderRequiresCourierOnClose(order.order_channel, order.order_type);
  if (needCourier && !courierId) {
    throw new Error("Bu sipariş için kurye seçimi zorunludur.");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    closed_at: now,
    closed_by_user_id: user.id,
    status: "delivered",
    courier_id: needCourier ? courierId : courierId ?? null,
  };

  let { error } = await supabase.from("orders").update(patch).eq("id", orderId).eq("restaurant_id", context.restaurant.id);

  if (error && isUnknownColumnError(error.message)) {
    const { error: e2 } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("restaurant_id", context.restaurant.id);
    if (e2) {
      throw new Error(`Sipariş kapatılamadı: ${e2.message}`);
    }
  } else if (error) {
    throw new Error(`Sipariş kapatılamadı: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function closeTableSession(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum gerekli.");
  }

  const sessionId = String(formData.get("table_session_id") ?? "").trim();
  if (!sessionId) {
    throw new Error("Oturum bulunamadı.");
  }

  const { data: session, error: se } = await supabase
    .from("table_sessions")
    .select("id, restaurant_id, closed_at")
    .eq("id", sessionId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  if (se || !session) {
    throw new Error(se?.message ?? "Oturum bulunamadı.");
  }
  if (session.closed_at) {
    throw new Error("Oturum zaten kapatılmış.");
  }

  const now = new Date().toISOString();

  const { error: u1 } = await supabase
    .from("table_sessions")
    .update({ closed_at: now })
    .eq("id", sessionId)
    .eq("restaurant_id", context.restaurant.id);

  if (u1) {
    if (isUnknownColumnError(u1.message)) {
      throw new Error("Masa oturumu tablosu eksik. Supabase patch çalıştırın.");
    }
    throw new Error(`Oturum kapatılamadı: ${u1.message}`);
  }

  const orderPatch = {
    closed_at: now,
    closed_by_user_id: user.id,
    status: "delivered" as OrderStatus,
  };

  let { error: u2 } = await supabase
    .from("orders")
    .update(orderPatch)
    .eq("table_session_id", sessionId)
    .eq("restaurant_id", context.restaurant.id)
    .is("closed_at", null)
    .neq("status", "cancelled");

  if (u2 && isUnknownColumnError(u2.message)) {
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("table_session_id", sessionId)
      .eq("restaurant_id", context.restaurant.id)
      .is("closed_at", null);
  } else if (u2) {
    throw new Error(`Siparişler güncellenemedi: ${u2.message}`);
  }

  revalidatePath("/dashboard/orders");
}

const ORDER_DETAIL_SELECT =
  "id, order_number, restaurant_id, order_type, order_channel, payment_method, status, customer_name, customer_phone, delivery_address, table_number, note, subtotal, delivery_fee, total, created_at, closed_at, closed_by_user_id, courier_id, table_session_id, couriers ( first_name, last_name )";

export async function getDashboardOrderById(orderId: string): Promise<OrderDetail | null> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  let { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAIL_SELECT)
    .eq("restaurant_id", context.restaurant.id)
    .eq("id", orderId)
    .maybeSingle<OrderDetail>();

  if (error && isUnknownColumnError(error.message)) {
    const legacy = await supabase
      .from("orders")
      .select(
        "id, order_number, restaurant_id, order_type, payment_method, status, customer_name, customer_phone, delivery_address, table_number, note, subtotal, delivery_fee, total, created_at",
      )
      .eq("restaurant_id", context.restaurant.id)
      .eq("id", orderId)
      .maybeSingle<Omit<OrderDetail, "order_channel" | "closed_at" | "closed_by_user_id" | "courier_id" | "table_session_id" | "couriers">>();
    error = legacy.error;
    data = legacy.data
      ? ({
          ...legacy.data,
          order_channel: legacy.data.order_type === "table" ? "table" : "online",
          closed_at: null,
          closed_by_user_id: null,
          courier_id: null,
          table_session_id: null,
          couriers: null,
        } as OrderDetail)
      : null;
  }

  if (error) {
    throw new Error(`Failed to fetch order detail: ${error.message}`);
  }

  return data;
}

export async function getDashboardOrderItems(orderId: string): Promise<OrderItem[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  let { data, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, unit_price, quantity, line_total, removed_ingredients, added_ingredients, item_note")
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderItem[]>();

  if (error && isUnknownColumnError(error.message)) {
    const legacy = await supabase
      .from("order_items")
      .select("id, order_id, product_name_snapshot, unit_price, quantity, line_total")
      .eq("restaurant_id", context.restaurant.id)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    error = legacy.error;
    data = (legacy.data ?? []).map((item) => ({
      ...item,
      removed_ingredients: null,
      added_ingredients: null,
      item_note: null,
    })) as OrderItem[];
  }

  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }

  return data ?? [];
}
