export const TABLE_SESSION_STATUSES = ["active", "bill_requested", "closed"] as const;

export type TableSessionStatus = (typeof TABLE_SESSION_STATUSES)[number];

export const TABLE_SESSION_OPENED_BY = ["table_qr", "waiter", "cashier"] as const;

export type TableSessionOpenedBy = (typeof TABLE_SESSION_OPENED_BY)[number];

export type TableSessionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  table_number: number;
  status: TableSessionStatus;
  opened_at: string;
  closed_at: string | null;
  opened_by: TableSessionOpenedBy;
};

export type TableSessionInsert = Omit<TableSessionRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
