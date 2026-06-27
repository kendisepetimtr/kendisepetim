import { getCurrentOwnerTenant } from "@/lib/owner-admin/guard";
import { buildTenantPanelUrl } from "@/lib/tenant-routing";
import { redirect } from "next/navigation";

/** /m/[slug]/admin rotalarinda slug ile sahip tenant eslesmesini dogrular. */
export async function requireOwnerTenantSlugMatch(slug: string) {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    redirect(`/giris?next=${encodeURIComponent("/admin")}`);
  }
  if (tenant.subdomain !== slug) {
    redirect(buildTenantPanelUrl(tenant.subdomain, "/admin"));
  }
  return tenant;
}
