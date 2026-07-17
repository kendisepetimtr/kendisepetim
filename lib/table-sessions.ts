import type { TableSessionOpenedBy } from "@/lib/supabase/table-session-types";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

/** Masada acik oturum yoksa yeni session acar; varsa mevcut id'yi dondurur. */
export async function ensureTableSession(
  svc: ServiceClient,
  tenantId: string,
  tableNumber: number,
  openedBy: TableSessionOpenedBy = "table_qr",
  waiterId?: string,
): Promise<string> {
  const { data: existing, error: findErr } = await svc
    .from("table_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("table_number", tableNumber)
    .in("status", ["active", "bill_requested"])
    .maybeSingle();

  if (findErr) {
    throw new Error(findErr.message);
  }
  if (existing?.id) {
    return existing.id as string;
  }

  const { data: created, error: insertErr } = await svc
    .from("table_sessions")
    .insert({
      tenant_id: tenantId,
      table_number: tableNumber,
      status: "active",
      opened_by: openedBy,
      ...(waiterId ? { waiter_id: waiterId } : {}),
    })
    .select("id")
    .single();

  if (insertErr || !created?.id) {
    throw new Error(insertErr?.message ?? "Masa oturumu açılamadı.");
  }

  return created.id as string;
}
