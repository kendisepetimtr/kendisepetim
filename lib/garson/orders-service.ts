import { writeActivityLog } from "@/lib/activity-log";
import { isBusinessOpenNow } from "@/lib/business-hours";
import { emptyCustomerAddress } from "@/lib/customer-address";
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

export async function placeWaiterOrder(input: {
  tenant: Pick<
    TenantRow,
    "id" | "subdomain" | "open_time" | "close_time" | "table_count" | "dine_in_enabled" | "public_menu_enabled"
  >;
  tableNumber: number;
  lines: PublicOrderLineInput[];
  orderNote?: string;
}): Promise<{ ok: true; orderId: string; orderCode: string } | { ok: false; error: string }> {
  const { tenant, tableNumber } = input;
  const tableCount = Number(tenant.table_count ?? 0);

  if (tenant.public_menu_enabled !== true || tenant.dine_in_enabled !== true) {
    return { ok: false, error: "Masa siparişi alınamıyor." };
  }
  if (tableNumber < 1 || tableNumber > tableCount) {
    return { ok: false, error: "Geçersiz masa numarası." };
  }
  if (!isBusinessOpenNow(tenant.open_time, tenant.close_time)) {
    return { ok: false, error: "Restoran şu anda kapalı." };
  }

  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (rawLines.length === 0) {
    return { ok: false, error: "Siparişte en az bir ürün olmalıdır." };
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
    const lines = buildOrderLines(rawLines, catalogMap, "dine_in");

    if (lines.length === 0) {
      return { ok: false, error: "Siparişte en az bir ürün olmalıdır." };
    }

    const total = lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0);
    const code = orderCode();
    const tableSessionId = await ensureTableSession(svc, tenant.id, tableNumber, "waiter");
    const orderNote = typeof input.orderNote === "string" ? input.orderNote.trim() : "";

    const { data: insertedOrder, error: orderError } = await svc
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        order_code: code,
        order_source: "waiter",
        fulfillment_type: "dine_in",
        table_number: tableNumber,
        table_session_id: tableSessionId,
        total,
        customer_first_name: "Garson",
        customer_last_name: `Masa ${tableNumber}`,
        customer_phone: "-",
        customer_email: "",
        address_json: emptyCustomerAddress(),
        payment_method: "cash",
        order_note: orderNote,
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
      actor_type: "waiter",
      actor_label: "Garson",
      action: "order_created",
      entity_type: "order",
      entity_id: insertedOrder.id as string,
      order_code: insertedOrder.order_code as string,
      metadata: {
        source: "waiter",
        fulfillment_type: "dine_in",
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

