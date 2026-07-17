import GarsonPanelClient from "@/components/garson/garson-panel-client";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedWaiterTenant } from "@/lib/garson/waiter-tenant";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";

export default async function TenantGarsonPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedWaiterTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const [grid, menu] = await Promise.all([
    loadGarsonTableGrid(auth.tenant.id, auth.tenant.table_count ?? 0),
    loadVisibleMenuForTenant(auth.tenant.id),
  ]);

  return (
    <GarsonPanelClient
      businessName={auth.tenant.business_name}
      subdomain={auth.tenant.subdomain}
      waiterDisplayName={auth.waiter.displayName}
      menu={menu}
      initialTables={grid.ok ? grid.tables : []}
    />
  );
}
