import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";

/** Slug ile tenant yukler — personel panelleri icin (oturum gerektirmez). */
export async function getTenantBySubdomain(slug: string): Promise<TenantRow | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.from("tenants").select("*").eq("subdomain", normalized).maybeSingle();
    if (error || !data) return null;
    return data as TenantRow;
  } catch {
    return null;
  }
}
