import { fulfillmentTypeLabel, type FulfillmentType } from "@/lib/fulfillment";
import type { CustomerAddress } from "@/lib/customer-address";

export type DashboardCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  orderCount: number;
  lastOrderAt: string;
  lastFulfillmentType: FulfillmentType | null;
  fromOrders: true;
};

export function customerChannelLabel(type: FulfillmentType | null): string {
  if (!type) return "—";
  return fulfillmentTypeLabel(type);
}
