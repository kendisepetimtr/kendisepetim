export const ACTIVITY_ACTOR_TYPES = [
  "owner",
  "admin",
  "waiter",
  "cashier",
  "system",
  "customer",
] as const;

export type ActivityActorType = (typeof ACTIVITY_ACTOR_TYPES)[number];

export type ActivityLogRow = {
  id: string;
  created_at: string;
  tenant_id: string;
  actor_type: ActivityActorType;
  actor_label: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  order_code: string | null;
  metadata: Record<string, unknown>;
};

export type ActivityLogInsert = Omit<ActivityLogRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
