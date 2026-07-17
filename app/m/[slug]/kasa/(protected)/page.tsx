import { redirect } from "next/navigation";
import KasaPanelClient from "@/components/kasa/kasa-panel-client";
import { loadKasaBoard } from "@/lib/kasa/board-service";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

export default async function TenantKasaPanelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.dineIn && !features.pickup) {
    redirect(getDefaultKasaPath(features));
  }

  const [board, menu] = await Promise.all([
    loadKasaBoard(auth.tenant.id, auth.tenant.table_count ?? 0, {
      dineInEnabled: features.dineIn,
      pickupEnabled: features.pickup,
    }),
    loadVisibleMenuForTenant(auth.tenant.id),
  ]);

  return (
    <KasaPanelClient
      businessName={auth.tenant.business_name}
      subdomain={auth.tenant.subdomain}
      tenantId={auth.tenant.id}
      features={features}
      initialTables={board.ok ? board.board.tables : []}
      initialPickupSlots={board.ok ? board.board.pickupSlots : []}
      menu={menu}
      paymentFlags={tenantPaymentFlagsFromRow(auth.tenant)}
    />
  );
}
