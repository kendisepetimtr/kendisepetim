export type WaiterRow = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  pin_hash: string;
  pin_set_at: string;
  is_active: boolean;
};

/** API / UI için PIN hash gizlenmiş satır */
export type WaiterPublicRow = Omit<WaiterRow, "pin_hash">;

export function waiterDisplayName(waiter: Pick<WaiterRow, "first_name" | "last_name">): string {
  return `${waiter.first_name} ${waiter.last_name}`.trim();
}

export function toWaiterPublicRow(row: WaiterRow): WaiterPublicRow {
  const { pin_hash: _pin, ...rest } = row;
  return rest;
}
