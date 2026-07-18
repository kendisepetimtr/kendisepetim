import SuperadminTenantCards from "@/components/superadmin/superadmin-tenant-cards";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import { loadTenantOrderCounts } from "@/lib/superadmin/order-counts";
import { SUPERADMIN_TENANT_SELECT } from "@/lib/superadmin/tenant-select";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";

export default async function SuperadminTenantsPage() {
  await requireSuperadminOrRedirect();

  let tenants: TenantRow[] = [];
  let loadError: string | null = null;
  let orderCounts: Record<string, number> = {};

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
        marketplace_enabled: row.marketplace_enabled === true,
      })) as TenantRow[];
      orderCounts = await loadTenantOrderCounts(tenants.map((t) => t.id));
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Bağlantı hatası.";
  }

  return (
    <SuperadminTenantCards
      initialTenants={tenants}
      orderCounts={orderCounts}
      loadError={loadError}
    />
  );
}
