import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { formatAddressOneLine, type CustomerAddress } from "@/lib/customer-address";
import type { OrderStatus } from "@/lib/supabase/order-types";
import type { DeliveryStatus, FulfillmentType } from "@/lib/fulfillment";

export type MusteriOrderLineView = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type MusteriOrderView = {
  id: string;
  orderCode: string;
  createdAt: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  fulfillmentType: FulfillmentType | null;
  total: number;
  restaurantName: string;
  subdomain: string;
  addressLine: string;
  lines: MusteriOrderLineView[];
};

function parseAddress(raw: unknown): CustomerAddress {
  if (typeof raw !== "object" || raw === null) {
    return {
      neighborhood: "",
      street: "",
      buildingNo: "",
      buildingName: "",
      floor: "",
      apartmentNo: "",
      livesInSite: false,
      siteName: "",
      block: "",
    };
  }
  const a = raw as Record<string, unknown>;
  return {
    neighborhood: typeof a.neighborhood === "string" ? a.neighborhood : "",
    street: typeof a.street === "string" ? a.street : "",
    buildingNo: typeof a.buildingNo === "string" ? a.buildingNo : "",
    buildingName: typeof a.buildingName === "string" ? a.buildingName : "",
    floor: typeof a.floor === "string" ? a.floor : "",
    apartmentNo: typeof a.apartmentNo === "string" ? a.apartmentNo : "",
    livesInSite: a.livesInSite === true,
    siteName: typeof a.siteName === "string" ? a.siteName : "",
    block: typeof a.block === "string" ? a.block : "",
  };
}

export async function loadCustomerOrders(userId: string): Promise<MusteriOrderView[]> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("orders")
      .select(
        "id, created_at, order_code, status, total, delivery_status, fulfillment_type, address_json, tenant_id, tenants ( business_name, subdomain ), order_lines ( product_id, name, qty, unit_price )",
      )
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      const t = tenant as { business_name?: string; subdomain?: string } | null;
      const rawLines = Array.isArray(row.order_lines) ? row.order_lines : [];
      const lines: MusteriOrderLineView[] = rawLines.map((line) => {
        const l = line as Record<string, unknown>;
        return {
          productId: typeof l.product_id === "string" ? l.product_id : "",
          name: typeof l.name === "string" ? l.name : "Ürün",
          qty: Number(l.qty) || 1,
          unitPrice: Number(l.unit_price) || 0,
        };
      });
      return {
        id: row.id as string,
        orderCode: (row.order_code as string) ?? "",
        createdAt: row.created_at as string,
        status: row.status as OrderStatus,
        deliveryStatus: (row.delivery_status as DeliveryStatus | null) ?? null,
        fulfillmentType: (row.fulfillment_type as FulfillmentType | null) ?? null,
        total: Number(row.total) || 0,
        restaurantName: t?.business_name ?? "Restoran",
        subdomain: t?.subdomain ?? "",
        addressLine: formatAddressOneLine(parseAddress(row.address_json)),
        lines,
      };
    });
  } catch {
    return [];
  }
}
