import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import type { DeliveryStatus, FulfillmentType, OrderSource } from "@/lib/fulfillment";
import type { SelectedVariation } from "@/lib/menu-variations";

export type OrderStatus = "new" | "confirmed" | "preparing" | "completed" | "cancelled";

export type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  order_code: string;
  order_source: OrderSource;
  status: OrderStatus;
  total: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  address_json: Record<string, unknown>;
  payment_method: CheckoutPaymentMethod;
  payment_method_at_close: CheckoutPaymentMethod | null;
  meal_card_brand_id: MealCardBrandId | null;
  paid_at: string | null;
  order_note: string;
  courier_note: string;
  fulfillment_type: FulfillmentType;
  customer_latitude: number | null;
  customer_longitude: number | null;
  table_number: number | null;
  table_session_id: string | null;
  courier_id: string | null;
  delivery_status: DeliveryStatus | null;
  customer_user_id?: string | null;
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
  selected_options: SelectedVariation[];
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
