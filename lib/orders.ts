import type { CustomerAddress } from "@/lib/customer-address";
import type { DeliveryStatus, FulfillmentType } from "@/lib/fulfillment";
import type { SelectedVariation } from "@/lib/menu-variations";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import type { OrderStatus } from "@/lib/supabase/order-types";

export type PublicOrderLineInput = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  removedIngredients?: string[];
  selectedOptions?: SelectedVariation[];
};

export type PublicOrderCreatePayload = {
  subdomain: string;
  orderSource: string;
  fulfillmentType: FulfillmentType;
  tableNumber?: number;
  lines: PublicOrderLineInput[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
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
  selectedOptions: SelectedVariation[];
};

export type AdminOrder = {
  id: string;
  orderCode: string;
  createdAt: string;
  status: OrderStatus;
  orderSource: string;
  fulfillmentType: FulfillmentType;
  tableNumber: number | null;
  deliveryStatus: DeliveryStatus | null;
  courierId: string | null;
  customerLatitude: number | null;
  customerLongitude: number | null;
  lines: AdminOrderLine[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  paymentMethod: CheckoutPaymentMethod;
  paymentMethodAtClose: CheckoutPaymentMethod | null;
  mealCardBrandId?: MealCardBrandId;
  orderNote: string;
};
