import { formatAddressOneLine } from "@/lib/customer-address";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { AdminOrder } from "@/lib/orders";
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
    orderCode: order.orderCode,
    createdAt: order.createdAt,
    fulfillmentLabel: fulfillmentReceiptLabel(order),
    customerName: `${order.firstName} ${order.lastName}`.trim() || undefined,
    customerPhone: order.phone || undefined,
    customerAddress:
      order.fulfillmentType === "delivery" ? formatAddressOneLine(order.address) : undefined,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    total: order.total,
    paymentMethodLabel: paymentMethodLabel(order.paymentMethod, order.mealCardBrandId),
    paymentAtCloseLabel: closeLabel,
    orderNote: order.orderNote || undefined,
  };
}

/** Masa oturumu kapanışında tüm siparişleri tek fişte birleştirir. */
export function sessionOrdersToReceiptData(
  orders: AdminOrder[],
  tableNumber: number,
  businessName: string,
  sessionTotal: number,
  paymentAtClose: { method: CheckoutPaymentMethod; mealCardBrandId?: MealCardBrandId },
): ReceiptOrderData {
  const items = orders.flatMap(mapLines);
  const orderCodes = orders.map((o) => o.orderCode).join(", ");
  const notes = orders.map((o) => o.orderNote.trim()).filter(Boolean);
  const first = orders[0];

  return {
    businessName,
    orderCode: orderCodes || `MASA-${tableNumber}`,
    createdAt: first?.createdAt ?? new Date().toISOString(),
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
    orderNote: notes.length > 0 ? notes.join(" · ") : undefined,
  };
}
