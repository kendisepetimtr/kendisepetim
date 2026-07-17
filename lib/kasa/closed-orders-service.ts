import { buildAdminOrders } from "@/lib/order-map";
import type { AdminOrder } from "@/lib/orders";
import { getReportDayRange, type ReportDayConfig } from "@/lib/orders-report";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { OrderLineRow, OrderRow } from "@/lib/supabase/order-types";

function closeInstantIso(row: OrderRow): string {
  return row.paid_at || row.created_at;
}

/**
 * Seçili iş gününde (takvim / vardiya) kapanan siparişler — masa, gel-al, paket.
 * Filtre: paid_at (yoksa created_at) aralıkta; status completed.
 */
export async function loadKasaClosedOrdersForBusinessDay(
  tenantId: string,
  dayOffset: number,
  config?: ReportDayConfig,
  limit = 80,
): Promise<{ ok: true; orders: AdminOrder[] } | { ok: false; error: string }> {
  try {
    const { start, end } = getReportDayRange(Math.max(0, dayOffset), config);
    const svc = createServiceSupabaseClient();

    // Geniş pencere: paid_at null olanlar için created_at; sonra client-side kesin filtre.
    const lookbackStart = new Date(start.getTime());
    lookbackStart.setDate(lookbackStart.getDate() - 1);
    const lookAheadEnd = new Date(end.getTime());
    lookAheadEnd.setDate(lookAheadEnd.getDate() + 1);

    const { data: rows, error } = await svc
      .from("orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", lookbackStart.toISOString())
      .lt("created_at", lookAheadEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(limit * 3, 60)));

    if (error) {
      return { ok: false, error: error.message };
    }

    const startMs = start.getTime();
    const endMs = end.getTime();
    const orderRows = ((rows ?? []) as OrderRow[])
      .filter((row) => {
        const at = new Date(closeInstantIso(row)).getTime();
        return at >= startMs && at < endMs;
      })
      .sort((a, b) => closeInstantIso(b).localeCompare(closeInstantIso(a)))
      .slice(0, limit);

    if (orderRows.length === 0) {
      return { ok: true, orders: [] };
    }

    const orderIds = orderRows.map((o) => o.id);
    const { data: lineRows, error: lineErr } = await svc
      .from("order_lines")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("order_id", orderIds);

    if (lineErr) {
      return { ok: false, error: lineErr.message };
    }

    return { ok: true, orders: buildAdminOrders(orderRows, (lineRows ?? []) as OrderLineRow[]) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kapanan siparişler yüklenemedi." };
  }
}
