import { PARTNER_PENDING_PATH, partnerAbsoluteUrl } from "@/lib/partner/host";
import { isApplicationApproved } from "@/lib/partner/status";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { buildTenantPanelUrl } from "@/lib/tenant-routing";

export type OwnerTenantRef = {
  id: string;
  subdomain: string;
  business_name: string;
  application_status?: string | null;
  dashboard_enabled?: boolean | null;
};

export async function getOwnerTenantByUserId(userId: string): Promise<OwnerTenantRef | null> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("tenants")
      .select("id, subdomain, business_name, application_status, dashboard_enabled")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as OwnerTenantRef;
  } catch {
    return null;
  }
}

/** Başarılı giriş / kayıt sonrası hedef. */
export async function resolveOwnerDashboardUrl(userId: string, siteOrigin?: string): Promise<string> {
  const tenant = await getOwnerTenantByUserId(userId);
  if (!tenant) return "/kayit?reason=tenant-missing";
  if (!isApplicationApproved(tenant.application_status) || tenant.dashboard_enabled === false) {
    return partnerAbsoluteUrl(PARTNER_PENDING_PATH, siteOrigin ?? "https://partner.kendisepetim.com");
  }
  return buildTenantPanelUrl(tenant.subdomain, "/dashboard", siteOrigin);
}
