export const ORDER_CANCEL_REASONS = ["out_of_stock", "closed", "out_of_area", "other"] as const;

export type OrderCancelReason = (typeof ORDER_CANCEL_REASONS)[number];

export const ORDER_CANCEL_REASON_LABELS: Record<OrderCancelReason, string> = {
  out_of_stock: "Stok yok",
  closed: "Restoran kapalı",
  out_of_area: "Bölge dışı",
  other: "Diğer",
};

export function isOrderCancelReason(value: unknown): value is OrderCancelReason {
  return typeof value === "string" && (ORDER_CANCEL_REASONS as readonly string[]).includes(value);
}

export function formatCancelReasonForCustomer(
  reason: OrderCancelReason | null | undefined,
  note: string | null | undefined,
): string {
  const label = reason ? ORDER_CANCEL_REASON_LABELS[reason] : "İptal edildi";
  const extra = typeof note === "string" ? note.trim() : "";
  return extra ? `${label} — ${extra}` : label;
}
