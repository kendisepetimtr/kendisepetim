import { PARTNER_PENDING_PATH, partnerAbsoluteUrl } from "@/lib/partner/host";
import { isApplicationApproved } from "@/lib/partner/status";
import { getRequestSiteUrl } from "@/lib/site-url";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function redirectUnapprovedTenantPanel(slug: string) {
  try {
    const svc = createServiceSupabaseClient();
    const { data } = await svc
      .from("tenants")
      .select("application_status, dashboard_enabled")
      .eq("subdomain", slug.toLowerCase())
      .maybeSingle();
    if (data && isApplicationApproved(data.application_status) && data.dashboard_enabled !== false) {
      return;
    }
  } catch {
    /* kapalı say */
  }
  const origin = await getRequestSiteUrl();
  redirect(partnerAbsoluteUrl(PARTNER_PENDING_PATH, origin));
}
