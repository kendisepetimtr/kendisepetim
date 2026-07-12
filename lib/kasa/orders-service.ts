import { writeActivityLog } from "@/lib/activity-log";
import { isBusinessOpenNow } from "@/lib/business-hours";
import {
  emptyCustomerAddress,
  type CustomerAddress,
  validateCustomerFormForFulfillment,
  type CustomerFormValues,
} from "@/lib/customer-address";
import type { FulfillmentType } from "@/lib/fulfillment";
import {
  buildOrderLineCatalog,
  buildOrderLines,
  extractOrderLineProductIds,
  ORDER_LINE_PRODUCT_COLUMNS,
} from "@/lib/order-lines-build";
import type { PublicOrderLineInput } from "@/lib/orders";
import { ensureTableSession } from "@/lib/table-sessions";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { MenuProductRow } from "@/lib/supabase/menu-types";
import type { TenantRow } from "@/lib/supabase/tenant-types";

function orderCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KS-${rand}`;
}

export type PlaceCashierOrderInput = {
  tenant: Pick<
    TenantRow,
    | "id"
    | "subdomain"
    | "open_time"
    | "close_time"
    | "table_count"
    | "dine_in_enabled"
    | "public_menu_enabled"
    | "fulfillment_pickup_enabled"
    | "fulfillment_delivery_enabled"
  >;
  fulfillmentType: FulfillmentType;
  tableNumber?: number;
  lines: PublicOrderLineInput[];
  orderNote?: string;
  courierNote?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
};

export async function placeCashierOrder(
  input: PlaceCashierOrderInput,
): Promise<{ ok: true; orderId: string; orderCode: string } | { ok: false; error: string }> {
  const { tenant, fulfillmentType } = input;

  if (tenant.public_menu_enabled !== true) {
    return { ok: false, error: "Menü siparişe kapalı." };
  }
  if (!isBusinessOpenNow(tenant.open_time, tenant.close_time)) {
    return { ok: false, error: "Restoran şu anda kapalı." };
  }

  if (fulfillmentType === "dine_in") {
    const tableCount = Number(tenant.table_count ?? 0);
    const tableNumber = input.tableNumber;
    if (tenant.dine_in_enabled !== true) {
      return { ok: false, error: "Masa siparişi alınamıyor." };
    }
    if (tableNumber == null || tableNumber < 1 || tableNumber > tableCount) {
      return { ok: false, error: "Geçersiz masa numarası." };
    }
  } else if (fulfillmentType === "pickup") {
    if (tenant.fulfillment_pickup_enabled !== true) {
      return { ok: false, error: "Gel-al siparişi alınamıyor." };
    }
  } else if (fulfillmentType === "delivery") {
    if (tenant.fulfillment_delivery_enabled !== true) {
      return { ok: false, error: "Paket siparişi alınamıyor." };
    }
  }

  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (rawLines.length === 0) {
    return { ok: false, error: "Siparişte en az bir ürün olmalıdır." };
  }

  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  const phone = (input.phone ?? "").trim();
  const email = (input.email ?? "").trim();
  const address = input.address ?? emptyCustomerAddress();
  const orderNote = typeof input.orderNote === "string" ? input.orderNote.trim() : "";
  const courierNote = typeof input.courierNote === "string" ? input.courierNote.trim() : "";

  if (fulfillmentType === "delivery" || fulfillmentType === "pickup") {
    const formLike: CustomerFormValues = {
      firstName: firstName || (fulfillmentType === "pickup" ? "Gel-Al" : ""),
      lastName,
      phone: phone || (fulfillmentType === "pickup" ? "-" : ""),
      email,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      buildingName: address.buildingName,
      floor: address.floor,
      apartmentNo: address.apartmentNo,
      livesInSite: address.livesInSite,
      siteName: address.siteName,
      block: address.block,
      orderNote,
      courierNote,
    };
    if (fulfillmentType === "delivery") {
      const err = validateCustomerFormForFulfillment(formLike, "delivery");
      if (err) return { ok: false, error: err };
    }
  }

  try {
    const svc = createServiceSupabaseClient();
    const productIds = extractOrderLineProductIds(rawLines);

    let catalogRows: MenuProductRow[] = [];
    if (productIds.length > 0) {
      const { data: productRows } = await svc
        .from("menu_products")
        .select(ORDER_LINE_PRODUCT_COLUMNS)
        .eq("tenant_id", tenant.id)
        .in("id", productIds);
      catalogRows = (productRows ?? []) as MenuProductRow[];
    }

    const catalogMap = buildOrderLineCatalog(catalogRows);
    const lines = buildOrderLines(rawLines, catalogMap, fulfillmentType);

    if (lines.length === 0) {
      return { ok: false, error: "Siparişte en az bir ürün olmalıdır." };
    }

    const total = lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0);
    const code = orderCode();

    let tableNumber: number | null = null;
    let tableSessionId: string | null = null;
    if (fulfillmentType === "dine_in") {
      tableNumber = input.tableNumber!;
      tableSessionId = await ensureTableSession(svc, tenant.id, tableNumber, "cashier");
    }

    const { data: insertedOrder, error: orderError } = await svc
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        order_code: code,
        order_source: "cashier",
        fulfillment_type: fulfillmentType,
        table_number: tableNumber,
        table_session_id: tableSessionId,
        total,
        customer_first_name:
          fulfillmentType === "dine_in" ? "Kasa" : firstName || (fulfillmentType === "pickup" ? "Gel-Al" : "Müşteri"),
        customer_last_name: fulfillmentType === "dine_in" ? `Masa ${tableNumber}` : lastName,
        customer_phone: fulfillmentType === "dine_in" ? "-" : phone || "-",
        customer_email: email,
        address_json: fulfillmentType === "delivery" ? address : emptyCustomerAddress(),
        payment_method: "cash",
        order_note: orderNote,
        courier_note: fulfillmentType === "delivery" ? courierNote : "",
        customer_latitude:
          fulfillmentType === "delivery" && input.customerLatitude != null ? input.customerLatitude : null,
        customer_longitude:
          fulfillmentType === "delivery" && input.customerLongitude != null ? input.customerLongitude : null,
        delivery_status: fulfillmentType === "delivery" ? "pending" : null,
      })
      .select("id, order_code")
      .single();

    if (orderError || !insertedOrder) {
      return { ok: false, error: orderError?.message ?? "Sipariş kaydedilemedi." };
    }

    const { error: lineError } = await svc.from("order_lines").insert(
      lines.map((line) => ({
        order_id: insertedOrder.id,
        tenant_id: tenant.id,
        ...line,
      })),
    );

    if (lineError) {
      await svc.from("orders").delete().eq("id", insertedOrder.id);
      return { ok: false, error: "Sipariş kalemleri kaydedilemedi." };
    }

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "cashier",
      actor_label: "Kasa",
      action: "order_created",
      entity_type: "order",
      entity_id: insertedOrder.id as string,
      order_code: insertedOrder.order_code as string,
      metadata: {
        source: "cashier",
        fulfillment_type: fulfillmentType,
        table: tableNumber,
        item_count: lines.length,
      },
    });

    return {
      ok: true,
      orderId: insertedOrder.id as string,
      orderCode: insertedOrder.order_code as string,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sipariş kaydedilemedi." };
  }
}
