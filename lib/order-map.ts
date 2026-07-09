import { emptyCustomerAddress, type CustomerAddress } from "@/lib/customer-address";
import { sanitizeSelectedVariations } from "@/lib/menu-variations";
import type { AdminOrder } from "@/lib/orders";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";

function parseAddressJson(value: Record<string, unknown> | null | undefined): CustomerAddress {
  const raw = value ?? {};
  const fallback = emptyCustomerAddress();
  return {
    neighborhood: typeof raw.neighborhood === "string" ? raw.neighborhood : fallback.neighborhood,
    street: typeof raw.street === "string" ? raw.street : fallback.street,
    buildingNo: typeof raw.buildingNo === "string" ? raw.buildingNo : fallback.buildingNo,
    buildingName: typeof raw.buildingName === "string" ? raw.buildingName : fallback.buildingName,
    floor: typeof raw.floor === "string" ? raw.floor : fallback.floor,
    apartmentNo: typeof raw.apartmentNo === "string" ? raw.apartmentNo : fallback.apartmentNo,
    livesInSite: raw.livesInSite === true,
    siteName: typeof raw.siteName === "string" ? raw.siteName : fallback.siteName,
    block: typeof raw.block === "string" ? raw.block : fallback.block,
  };
}

export function buildAdminOrders(rows: OrderRow[], lineRows: OrderLineRow[]): AdminOrder[] {
  const linesByOrderId = new Map<string, OrderLineRow[]>();
  for (const line of lineRows) {
    const arr = linesByOrderId.get(line.order_id) ?? [];
    arr.push(line);
    linesByOrderId.set(line.order_id, arr);
  }

  return rows.map((row) => ({
    id: row.id,
    orderCode: row.order_code,
    createdAt: row.created_at,
    status: row.status,
    orderSource: row.order_source,
    fulfillmentType: row.fulfillment_type,
    tableNumber: row.table_number,
    deliveryStatus: row.delivery_status,
    courierId: row.courier_id,
    customerLatitude: row.customer_latitude != null ? Number(row.customer_latitude) : null,
    customerLongitude: row.customer_longitude != null ? Number(row.customer_longitude) : null,
    total: row.total,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    phone: row.customer_phone,
    email: row.customer_email,
    address: parseAddressJson(row.address_json),
    paymentMethod: row.payment_method,
    paymentMethodAtClose: row.payment_method_at_close,
    mealCardBrandId: row.meal_card_brand_id ?? undefined,
    orderNote: row.order_note,
    courierNote: row.courier_note ?? "",
    lines: (linesByOrderId.get(row.id) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((line) => ({
        id: line.id,
        productId: line.product_id ?? "",
        name: line.name,
        qty: line.qty,
        unitPrice: line.unit_price,
        removedIngredients: Array.isArray(line.removed_ingredients) ? line.removed_ingredients : [],
        selectedOptions: sanitizeSelectedVariations(line.selected_options),
      })),
  }));
}
