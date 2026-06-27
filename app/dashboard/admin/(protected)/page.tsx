import { getCurrentOwnerTenant } from "@/lib/owner-admin/guard";
import { buildTenantPanelUrl } from "@/lib/tenant-routing";
import { getRequestSiteUrl } from "@/lib/site-url";
import { redirect } from "next/navigation";

/** Eski merkezi admin rotasi → tenant subdomain /admin */
export default async function LegacyAdminRedirectPage() {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant) {
    redirect("/giris?next=/admin");
  }
  const origin = await getRequestSiteUrl();
  redirect(buildTenantPanelUrl(tenant.subdomain, "/admin", origin));
}
