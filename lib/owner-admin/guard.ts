import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OWNER_ADMIN_COOKIE, verifyOwnerAdminToken } from "@/lib/owner-admin/session";
import type { TenantRow } from "@/lib/supabase/tenant-types";

export async function getCurrentOwnerTenant(): Promise<TenantRow | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantRow;
}

function isValidOwnerAdminSessionForTenant(
  tenant: Pick<TenantRow, "id" | "owner_user_id" | "owner_admin_pin_set_at">,
  rawToken: string | undefined,
): boolean {
  if (!tenant.owner_user_id || !tenant.owner_admin_pin_set_at) return false;
  const payload = verifyOwnerAdminToken(rawToken);
  if (!payload) return false;
  return (
    payload.userId === tenant.owner_user_id &&
    payload.tenantId === tenant.id &&
    payload.pinSetAt === tenant.owner_admin_pin_set_at
  );
}

export async function getOwnerAdminSessionValid(): Promise<boolean> {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant) return false;
  const jar = await cookies();
  return isValidOwnerAdminSessionForTenant(tenant, jar.get(OWNER_ADMIN_COOKIE)?.value);
}

export async function requireOwnerAdminOrRedirect(nextPath = "/dashboard/admin"): Promise<TenantRow> {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    redirect(`/giris?next=${encodeURIComponent(nextPath)}`);
  }

  const jar = await cookies();
  const isValid = isValidOwnerAdminSessionForTenant(tenant, jar.get(OWNER_ADMIN_COOKIE)?.value);
  if (!isValid) {
    redirect(`/dashboard/admin/pin?next=${encodeURIComponent(nextPath)}`);
  }

  return tenant;
}
