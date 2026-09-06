import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { formatAddressOneLine, type CustomerAddress } from "@/lib/customer-address";
import type { OrderStatus } from "@/lib/supabase/order-types";
import type { DeliveryStatus, FulfillmentType } from "@/lib/fulfillment";
import { parseOrderEtaFromTenant } from "@/lib/musteri/order-tracking";

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
  dailyNumber: number | null;
  etaMinutes: number | null;
  cancelReason: string | null;
  cancelNote: string | null;
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

const CUSTOMER_ORDER_SELECT =
  "id, created_at, order_code, status, total, delivery_status, fulfillment_type, address_json, tenant_id, daily_number, cancel_reason, cancel_note, tenants ( business_name, subdomain, order_eta_auto_enabled, order_eta_mode, order_eta_total_minutes, order_eta_prep_minutes, order_eta_ready_minutes, order_eta_dispatch_minutes, order_eta_deliver_minutes ), order_lines ( product_id, name, qty, unit_price )";

function mapCustomerOrderRow(row: Record<string, unknown>): MusteriOrderView {
  const tenantRaw = row.tenants;
  const tenant = Array.isArray(tenantRaw) ? tenantRaw[0] : tenantRaw;
  const t = (tenant ?? null) as Record<string, unknown> | null;
  const eta = parseOrderEtaFromTenant(t);
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
    restaurantName: (typeof t?.business_name === "string" ? t.business_name : null) ?? "Restoran",
    subdomain: (typeof t?.subdomain === "string" ? t.subdomain : null) ?? "",
    addressLine: formatAddressOneLine(parseAddress(row.address_json)),
    lines,
    dailyNumber:
      row.daily_number != null && Number.isFinite(Number(row.daily_number))
        ? Number(row.daily_number)
        : null,
    etaMinutes: eta.autoEnabled ? eta.totalMinutes : null,
    cancelReason: typeof row.cancel_reason === "string" ? row.cancel_reason : null,
    cancelNote: typeof row.cancel_note === "string" ? row.cancel_note : null,
  };
}

export async function loadCustomerOrders(userId: string): Promise<MusteriOrderView[]> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];
    return data.map((row) => mapCustomerOrderRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

function isActiveCustomerOrder(order: MusteriOrderView): boolean {
  if (order.status === "cancelled" || order.status === "completed") return false;
  if (order.deliveryStatus === "delivered" || order.deliveryStatus === "cancelled") return false;
  return true;
}

export async function loadCustomerActiveOrder(userId: string): Promise<MusteriOrderView | null> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return null;
    for (const row of data) {
      const order = mapCustomerOrderRow(row as Record<string, unknown>);
      if (isActiveCustomerOrder(order)) return order;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadCustomerOrderById(
  userId: string,
  orderId: string,
): Promise<MusteriOrderView | null> {
  if (!orderId) return null;
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("orders")
      .select(CUSTOMER_ORDER_SELECT)
      .eq("customer_user_id", userId)
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return null;
    return mapCustomerOrderRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
