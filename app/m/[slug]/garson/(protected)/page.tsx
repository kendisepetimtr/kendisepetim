import GarsonPanelClient from "@/components/garson/garson-panel-client";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedWaiterTenant } from "@/lib/garson/waiter-tenant";

export default async function TenantGarsonPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedWaiterTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const grid = await loadGarsonTableGrid(auth.tenant.id, auth.tenant.table_count ?? 0);

  return (
    <GarsonPanelClient
      businessName={auth.tenant.business_name}
      initialTables={grid.ok ? grid.tables : []}
    />
  );
}
