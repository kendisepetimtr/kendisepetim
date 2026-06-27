import { redirect } from "next/navigation";

import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";

import { getWaiterSessionValidForSlug } from "@/lib/garson/waiter-tenant";
import { getCashierSessionValidForSlug } from "@/lib/kasa/cashier-tenant";



export async function requireWaiterTenantForSlug(slug: string) {

  const tenant = await getTenantBySubdomain(slug);

  if (!tenant) {

    redirect("/");

  }

  if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {

    redirect("/");

  }

  return tenant;

}



export async function requireWaiterOrRedirect(slug: string, nextPath = "/garson") {
  await requireWaiterTenantForSlug(slug);
  const valid = await getWaiterSessionValidForSlug(slug);
  if (!valid) {
    redirect(`/garson/pin?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function requireCashierTenantForSlug(slug: string) {
  const tenant = await getTenantBySubdomain(slug);
  if (!tenant) {
    redirect("/");
  }
  if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {
    redirect("/");
  }
  return tenant;
}

export async function requireCashierOrRedirect(slug: string, nextPath = "/kasa") {
  await requireCashierTenantForSlug(slug);
  const valid = await getCashierSessionValidForSlug(slug);
  if (!valid) {
    redirect(`/kasa/pin?next=${encodeURIComponent(nextPath)}`);
  }
}


