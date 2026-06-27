import KasaPanelClient from "@/components/kasa/kasa-panel-client";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";

export default async function TenantKasaPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const grid = await loadGarsonTableGrid(auth.tenant.id, auth.tenant.table_count ?? 0);

  return (
    <KasaPanelClient
      businessName={auth.tenant.business_name}
      initialTables={grid.ok ? grid.tables : []}
    />
  );
}
