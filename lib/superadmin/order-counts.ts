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

function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "";
  // TR numaralarında son 10 hane ile birleştir (0535… / 90535…)
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

async function countDistinctCustomersForTenant(
  svc: ReturnType<typeof createServiceSupabaseClient>,
  tenantId: string,
): Promise<number> {
  const keys = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    // Panel Müşteriler / kasa araması ile aynı: paket + gel-al (QR menü dahil), masa değil
    const { data, error } = await svc
      .from("orders")
      .select("customer_phone")
      .eq("tenant_id", tenantId)
      .in("fulfillment_type", ["delivery", "pickup"])
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      const raw = String((row as { customer_phone?: string | null }).customer_phone ?? "").trim();
      if (!raw || raw === "-") continue;
      const key = phoneKey(raw);
      if (key) keys.add(key);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return keys.size;
}

/**
 * Tenant başına benzersiz müşteri — paket + gel-al/QR siparişlerindeki geçerli telefon.
 * Masa siparişleri ve "-" placeholder sayılmaz (işletme paneli Müşteriler mantığına yakın).
 */
export async function loadTenantCustomerCounts(
  tenantIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(tenantIds.map((id) => [id, 0]));
  if (tenantIds.length === 0) return counts;

  try {
    const svc = createServiceSupabaseClient();
    await Promise.all(
      tenantIds.map(async (tenantId) => {
        counts[tenantId] = await countDistinctCustomersForTenant(svc, tenantId);
      }),
    );
  } catch {
    /* sayılar 0 kalır */
  }

  return counts;
}
