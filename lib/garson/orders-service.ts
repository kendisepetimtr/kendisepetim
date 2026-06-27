import { writeActivityLog } from "@/lib/activity-log";
import { isBusinessOpenNow } from "@/lib/business-hours";
import { emptyCustomerAddress } from "@/lib/customer-address";
import { getProductPriceForFulfillment } from "@/lib/product-pricing";
import type { PublicOrderLineInput } from "@/lib/orders";
import { ensureTableSession } from "@/lib/table-sessions";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { MenuProductRow } from "@/lib/supabase/menu-types";
import type { TenantRow } from "@/lib/supabase/tenant-types";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function orderCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KS-${rand}`;
}

function menuRowToPricingProduct(row: MenuProductRow) {
  return {
    price: Number(row.price),
    usePackagePrice: row.use_package_price,
    packagePrice: Number(row.package_price),
  };
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
    const productIds = rawLines
      .map((line) => (typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null))
      .filter((id): id is string => id != null);

    const productPriceMap = new Map<string, ReturnType<typeof menuRowToPricingProduct>>();
    if (productIds.length > 0) {
      const { data: productRows } = await svc
        .from("menu_products")
        .select("id, price, package_price, use_package_price")
        .eq("tenant_id", tenant.id)
        .in("id", productIds);
      for (const row of (productRows ?? []) as MenuProductRow[]) {
        productPriceMap.set(row.id, menuRowToPricingProduct(row));
      }
    }

    const lines = rawLines
      .map((line, index) => {
        const name = typeof line.name === "string" ? line.name.trim() : "";
        const qty =
          typeof line.qty === "number" && Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 0;
        if (!name || qty <= 0) return null;

        const productId = typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null;
        const catalog = productId ? productPriceMap.get(productId) : null;
        const unitPrice = catalog
          ? getProductPriceForFulfillment(
              {
                id: productId ?? "",
                categoryId: "",
                name,
                description: "",
                ingredients: "",
                price: catalog.price,
                usePackagePrice: catalog.usePackagePrice,
                packagePrice: catalog.packagePrice,
                hidden: false,
                signatureDish: false,
                checkoutUpsell: false,
                imageDataUrl: "",
                warningPresetKeys: [],
                customWarnings: [],
                warningBadges: [],
              },
              "dine_in",
            )
          : typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0
            ? Math.round(line.unitPrice * 100) / 100
            : 0;

        return {
          product_id: productId,
          name,
          qty,
          unit_price: unitPrice,
          removed_ingredients: Array.isArray(line.removedIngredients)
            ? line.removedIngredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [],
          sort_order: index,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line != null);

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
