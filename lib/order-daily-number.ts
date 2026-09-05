import { BUSINESS_TIME_ZONE } from "@/lib/business-hours";
import type { FulfillmentType } from "@/lib/fulfillment";
import type { SupabaseClient } from "@supabase/supabase-js";

/** İstanbul takvim günü YYYY-MM-DD */
export function istanbulCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDailyOrderLabel(
  dailyNumber: number | null | undefined,
  fulfillmentType: FulfillmentType,
  tableNumber?: number | null,
): string | undefined {
  if (dailyNumber == null || !Number.isFinite(dailyNumber) || dailyNumber < 1) return undefined;
  const n = Math.round(dailyNumber);
  if (fulfillmentType === "delivery") return `${n}. paket`;
  if (fulfillmentType === "pickup") return `${n}. gel-al`;
  if (tableNumber != null && tableNumber > 0) return `Masa ${tableNumber} · ${n}. sipariş`;
  return `${n}. sipariş`;
}

export async function allocateDailyOrderNumber(
  svc: SupabaseClient,
  tenantId: string,
): Promise<number | null> {
  const dayKey = istanbulCalendarDate();
  const { data, error } = await svc.rpc("allocate_order_daily_number", {
    p_tenant_id: tenantId,
    p_day_key: dayKey,
  });
  if (!error && typeof data === "number" && Number.isFinite(data) && data > 0) {
    return Math.round(data);
  }

  const start = new Date(`${dayKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const { count } = await svc
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  return (count ?? 0) + 1;
}
