/** Yeni sipariş bu süre görülmezse “cevap yok” ve ses tekrar eder. */
export const ORDER_UNSEEN_SLA_MS = 3 * 60 * 1000;

export function isOpenKitchenStatus(status: string | null | undefined): boolean {
  return status === "new" || status === "confirmed" || status === "preparing";
}

export function isOrderUnseenOverdue(input: {
  status: string | null | undefined;
  createdAt: string | null | undefined;
  seenAt?: string | null;
  now?: number;
}): boolean {
  if (!isOpenKitchenStatus(input.status)) return false;
  if (input.seenAt) return false;
  const created = input.createdAt ? Date.parse(input.createdAt) : NaN;
  if (!Number.isFinite(created)) return false;
  const now = input.now ?? Date.now();
  return now - created >= ORDER_UNSEEN_SLA_MS;
}

export function compareKitchenUrgency(
  a: { status: string; createdAt: string; seenAt?: string | null },
  b: { status: string; createdAt: string; seenAt?: string | null },
): number {
  const aOver = isOrderUnseenOverdue(a) ? 1 : 0;
  const bOver = isOrderUnseenOverdue(b) ? 1 : 0;
  if (aOver !== bOver) return bOver - aOver;
  const aUnseen = !a.seenAt && isOpenKitchenStatus(a.status) ? 1 : 0;
  const bUnseen = !b.seenAt && isOpenKitchenStatus(b.status) ? 1 : 0;
  if (aUnseen !== bUnseen) return bUnseen - aUnseen;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}
