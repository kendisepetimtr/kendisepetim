"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { CartItem, Order, OrderDetail, OrderItem, OrderStatus } from "../../types";
import { getCurrentRestaurantContext, getRestaurantBySlug } from "../tenants";
import { DELIVERY_FEE_TRY } from "./constants";

type OrderType = "table" | "delivery" | "pickup";
type PaymentMethod = "cash" | "card";
const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

type CreateOrderInput = {
  tenantSlug: string;
  orderType: OrderType;
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

export async function createOrderFromCheckout(input: CreateOrderInput): Promise<CreateOrderResult> {
  const orderType = String(input.orderType ?? "");
  const paymentMethod = String(input.paymentMethod ?? "");

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
  if (orderType === "delivery" && !deliveryAddress) {
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
    }))
    .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)
    .map((item) => ({ ...item, quantity: Math.floor(item.quantity) }));

  if (normalizedItems.length === 0) {
    throw new Error("Cart contains invalid items.");
  }

  const restaurant = await getRestaurantBySlug(input.tenantSlug);
  if (!restaurant) {
    throw new Error("Restaurant not found for tenant.");
  }

  const supabase = await createServerSupabaseClient();
  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, restaurant_id, name, price, is_active")
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

    const unitPrice = Number(product.price);
    const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

    return {
      product_id: product.id,
      product_name_snapshot: product.name,
      unit_price: Number(unitPrice.toFixed(2)),
      quantity: item.quantity,
      line_total: lineTotal,
    };
  });

  const subtotal = Number(
    orderItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2),
  );
  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE_TRY : 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const { data: insertedOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      order_type: orderType,
      payment_method: paymentMethod,
      status: "pending",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      table_number: tableNumber,
      delivery_address: deliveryAddress,
      note: orderNote,
    })
    .select("id")
    .single<{ id: string }>();

  if (orderError || !insertedOrder) {
    throw new Error(`Failed to create order: ${orderError?.message ?? "Unknown error"}`);
  }

  const { error: itemError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: insertedOrder.id,
      restaurant_id: restaurant.id,
      ...item,
    })),
  );

  if (itemError) {
    await supabase.from("orders").delete().eq("id", insertedOrder.id);
    throw new Error(`Failed to create order items: ${itemError.message}`);
  }

  return {
    ok: true,
    orderId: insertedOrder.id,
    total,
  };
}

export async function getDashboardOrdersForCurrentRestaurant(): Promise<Order[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, restaurant_id, order_type, payment_method, status, customer_name, total, created_at",
    )
    .eq("restaurant_id", context.restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Order[]>();

  if (error) {
    throw new Error(`Failed to fetch dashboard orders: ${error.message}`);
  }

  return data ?? [];
}

export async function updateOrderStatus(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!orderId || !validateOrderStatus(nextStatus)) {
    throw new Error("Invalid order update payload.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function getDashboardOrderById(orderId: string): Promise<OrderDetail | null> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, restaurant_id, order_type, payment_method, status, customer_name, customer_phone, delivery_address, table_number, note, subtotal, delivery_fee, total, created_at",
    )
    .eq("restaurant_id", context.restaurant.id)
    .eq("id", orderId)
    .maybeSingle<OrderDetail>();

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
  const { data, error } = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, unit_price, quantity, line_total")
    .eq("restaurant_id", context.restaurant.id)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderItem[]>();

  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }

  return data ?? [];
}
