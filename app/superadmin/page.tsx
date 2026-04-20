import SuperadminDashboard from "@/components/superadmin/superadmin-dashboard";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";

const SUPERADMIN_TENANT_SELECT = `
  id,
  created_at,
  updated_at,
  business_name,
  subdomain,
  owner_name,
  email,
  phone,
  owner_user_id,
  logo_url,
  hours_day_mode,
  open_time,
  close_time,
  payment_cash,
  payment_door_card,
  payment_meal_card,
  plan,
  public_menu_enabled,
  dashboard_enabled,
  owner_admin_pin_set_at
`;

export default async function SuperadminPage() {
  await requireSuperadminOrRedirect();

  let tenants: TenantRow[] = [];
  let loadError: string | null = null;

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("tenants")
      .select(SUPERADMIN_TENANT_SELECT)
      .order("created_at", { ascending: false });
    if (error) loadError = error.message;
    else {
      tenants = ((data ?? []) as Array<Omit<TenantRow, "owner_admin_pin_hash">>).map((row) => ({
        ...row,
        owner_admin_pin_hash: null,
      })) as TenantRow[];
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Bağlantı hatası.";
  }

  return <SuperadminDashboard initialTenants={tenants} loadError={loadError} />;
}
