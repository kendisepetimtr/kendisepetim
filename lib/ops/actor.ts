import type { ActivityActorType } from "@/lib/supabase/activity-log-types";

export type OpsActor = {
  type: Extract<ActivityActorType, "cashier" | "owner">;
  label: string;
};

export const CASHIER_OPS_ACTOR: OpsActor = {
  type: "cashier",
  label: "Kasa",
};

export function ownerOpsActor(ownerName?: string | null): OpsActor {
  const label = ownerName?.trim();
  return {
    type: "owner",
    label: label && label.length > 0 ? label : "Admin",
  };
}
