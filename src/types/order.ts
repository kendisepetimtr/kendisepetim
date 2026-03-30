export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type OrderType = "table" | "delivery" | "pickup";
export type OrderChannel = "online" | "table" | "package";
export type PaymentMethod = "cash" | "card";

export type Order = {
  id: string;
  order_number: number | null;
  restaurant_id: string;
  order_type: OrderType;
  order_channel: OrderChannel;
  payment_method: PaymentMethod;
  status: OrderStatus;
  customer_name: string | null;
  total: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_name_snapshot: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  removed_ingredients?: string[] | null;
  added_ingredients?: string[] | null;
  item_note?: string | null;
};

export type OrderDetail = {
  id: string;
  order_number: number | null;
  restaurant_id: string;
  order_type: OrderType;
  order_channel: OrderChannel;
  payment_method: PaymentMethod;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  table_number: string | null;
  note: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
};
