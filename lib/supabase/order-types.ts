import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";

export type OrderStatus = "new" | "confirmed" | "preparing" | "completed" | "cancelled";

export type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  order_code: string;
  order_source: string;
  status: OrderStatus;
  total: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  address_json: Record<string, unknown>;
  payment_method: CheckoutPaymentMethod;
  meal_card_brand_id: MealCardBrandId | null;
  order_note: string;
};

export type OrderLineRow = {
  id: string;
  created_at: string;
  order_id: string;
  tenant_id: string;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  removed_ingredients: string[];
  sort_order: number;
};

export type OrderInsert = Omit<OrderRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type OrderLineInsert = Omit<OrderLineRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
