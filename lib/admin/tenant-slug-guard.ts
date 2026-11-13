import { getCurrentOwnerTenant } from "@/lib/owner-admin/guard";
import { buildTenantPanelUrl } from "@/lib/tenant-routing";
import { redirect } from "next/navigation";

/** /m/[slug]/admin|dashboard rotalarinda slug ile sahip tenant eslesmesini dogrular. */
export async function requireOwnerTenantSlugMatch(slug: string, panelPath = "/admin") {
  const nextPath = panelPath.startsWith("/") ? panelPath : `/${panelPath}`;
  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    redirect(`/giris?next=${encodeURIComponent(nextPath)}`);
  }
  if (tenant.subdomain !== slug) {
    redirect(buildTenantPanelUrl(tenant.subdomain, nextPath));
  }
  return tenant;
}
