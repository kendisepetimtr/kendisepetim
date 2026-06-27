import { redirect } from "next/navigation";
import KasaPanelClient from "@/components/kasa/kasa-panel-client";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";

export default async function TenantKasaPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.dineIn && features.pickup) {
    redirect("/kasa/gel-al");
  }

  const grid = features.dineIn
    ? await loadGarsonTableGrid(auth.tenant.id, auth.tenant.table_count ?? 0)
    : { ok: true as const, tables: [] };

  return (
    <KasaPanelClient
      businessName={auth.tenant.business_name}
      features={features}
      initialTables={grid.ok ? grid.tables : []}
    />
  );
}
