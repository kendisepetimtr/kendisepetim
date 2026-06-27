import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { buildTenantPanelUrl } from "@/lib/tenant-routing";

export type OwnerTenantRef = {
  id: string;
  subdomain: string;
  business_name: string;
};

export async function getOwnerTenantByUserId(userId: string): Promise<OwnerTenantRef | null> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("tenants")
      .select("id, subdomain, business_name")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/** Basarili giris / kayit sonrasi hedef — tenant subdomain dashboard. */
export async function resolveOwnerDashboardUrl(userId: string, siteOrigin?: string): Promise<string> {
  const tenant = await getOwnerTenantByUserId(userId);
  if (!tenant) return "/dashboard";
  return buildTenantPanelUrl(tenant.subdomain, "/dashboard", siteOrigin);
}
