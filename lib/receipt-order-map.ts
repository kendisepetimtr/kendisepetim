import { formatAddressOneLine } from "@/lib/customer-address";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { formatDailyOrderLabel } from "@/lib/order-daily-number";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { AdminOrder } from "@/lib/orders";
import { getPrimaryPublicMenuUrl } from "@/lib/public-menu-urls";
import type { ReceiptItemLine, ReceiptOrderData } from "@/lib/receipt-template";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";

function fulfillmentReceiptLabel(order: AdminOrder): string {
  if (order.fulfillmentType === "dine_in" && order.tableNumber != null) {
    return `Masa ${order.tableNumber}`;
  }
  return fulfillmentTypeLabel(order.fulfillmentType);
}

function mapLines(order: AdminOrder): ReceiptItemLine[] {
  return order.lines.map((line) => {
    const modifiers = [
      ...formatSelectedVariationLabels(line.selectedOptions),
      ...line.removedIngredients.map((r) => `${r} çıkar`),
    ];
    return {
      qty: line.qty,
      name: line.name,
      unitPrice: line.unitPrice,
      lineTotal: Math.round(line.unitPrice * line.qty * 100) / 100,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    };
  });
}

export function adminOrderToReceiptData(
  order: AdminOrder,
  businessName: string,
  subdomain: string,
  paymentAtClose?: { method: CheckoutPaymentMethod; mealCardBrandId?: MealCardBrandId },
): ReceiptOrderData {
  const items = mapLines(order);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const closeLabel = paymentAtClose
    ? paymentMethodLabel(paymentAtClose.method, paymentAtClose.mealCardBrandId)
    : order.paymentMethodAtClose
      ? paymentMethodLabel(order.paymentMethodAtClose, order.mealCardBrandId)
      : undefined;

  return {
    businessName,
    subdomain,
    menuUrl: getPrimaryPublicMenuUrl(subdomain),
    orderCode: order.orderCode,
    dailyNumber: order.dailyNumber ?? null,
    dailyLabel: formatDailyOrderLabel(order.dailyNumber, order.fulfillmentType, order.tableNumber),
    createdAt: order.createdAt,
    fulfillmentType: order.fulfillmentType,
    fulfillmentLabel: fulfillmentReceiptLabel(order),
    customerName: `${order.firstName} ${order.lastName}`.trim() || undefined,
    customerPhone: order.phone || undefined,
    customerAddress:
      order.fulfillmentType === "delivery" ? formatAddressOneLine(order.address) : undefined,
    customerLatitude: order.customerLatitude,
    customerLongitude: order.customerLongitude,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    total: order.total,
    paymentMethodLabel: paymentMethodLabel(order.paymentMethod, order.mealCardBrandId),
    paymentAtCloseLabel: closeLabel,
    orderNote: order.orderNote || undefined,
    courierNote: order.courierNote || undefined,
  };
}

/** Masa oturumu kapanışında tüm siparişleri tek fişte birleştirir. */
export function sessionOrdersToReceiptData(
  orders: AdminOrder[],
  tableNumber: number,
  businessName: string,
  subdomain: string,
  sessionTotal: number,
  paymentAtClose: { method: CheckoutPaymentMethod; mealCardBrandId?: MealCardBrandId },
): ReceiptOrderData {
  const items = orders.flatMap(mapLines);
  const orderCodes = orders.map((o) => o.orderCode).join(", ");
  const kitchenNotes = orders.map((o) => o.orderNote.trim()).filter(Boolean);
  const courierNotes = orders.map((o) => o.courierNote.trim()).filter(Boolean);
  const first = orders[0];

  return {
    businessName,
    subdomain,
    menuUrl: getPrimaryPublicMenuUrl(subdomain),
    orderCode: orderCodes || `MASA-${tableNumber}`,
    dailyNumber: first?.dailyNumber ?? null,
    dailyLabel: formatDailyOrderLabel(first?.dailyNumber, "dine_in", tableNumber),
    createdAt: first?.createdAt ?? new Date().toISOString(),
    fulfillmentType: "dine_in",
    fulfillmentLabel: `Masa ${tableNumber}`,
    customerName: first ? `${first.firstName} ${first.lastName}`.trim() || undefined : undefined,
    customerPhone: first?.phone || undefined,
    items,
    subtotal: sessionTotal,
    total: sessionTotal,
    paymentMethodLabel: first
      ? paymentMethodLabel(first.paymentMethod, first.mealCardBrandId)
      : paymentMethodLabel(paymentAtClose.method, paymentAtClose.mealCardBrandId),
    paymentAtCloseLabel: paymentMethodLabel(paymentAtClose.method, paymentAtClose.mealCardBrandId),
    orderNote: kitchenNotes.length > 0 ? kitchenNotes.join(" · ") : undefined,
    courierNote: courierNotes.length > 0 ? courierNotes.join(" · ") : undefined,
  };
}
