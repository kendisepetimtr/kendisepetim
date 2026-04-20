import type { CustomerAddress } from "@/lib/customer-address";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import type { OrderStatus } from "@/lib/supabase/order-types";

export type PublicOrderLineInput = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  removedIngredients?: string[];
};

export type PublicOrderCreatePayload = {
  subdomain: string;
  orderSource: string;
  lines: PublicOrderLineInput[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  orderNote: string;
};

export type AdminOrderLine = {
  id: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  removedIngredients: string[];
};

export type AdminOrder = {
  id: string;
  orderCode: string;
  createdAt: string;
  status: OrderStatus;
  orderSource: string;
  lines: AdminOrderLine[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  orderNote: string;
};
