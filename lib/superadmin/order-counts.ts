import { createServiceSupabaseClient } from "@/lib/supabase/admin";

/** Tenant başına tüm sipariş sayısı (QR, paket, gel-al, masa — iptaller dahil). */
export async function loadTenantOrderCounts(
  tenantIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(tenantIds.map((id) => [id, 0]));
  if (tenantIds.length === 0) return counts;

  try {
    const svc = createServiceSupabaseClient();
    await Promise.all(
      tenantIds.map(async (tenantId) => {
        const { count, error } = await svc
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId);
        if (!error) counts[tenantId] = count ?? 0;
      }),
    );
  } catch {
    /* sayılar 0 kalır */
  }

  return counts;
}
