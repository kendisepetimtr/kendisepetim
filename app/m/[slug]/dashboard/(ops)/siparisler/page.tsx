import { redirect } from "next/navigation";
import KasaPanelClient from "@/components/kasa/kasa-panel-client";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { loadKasaBoard } from "@/lib/kasa/board-service";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { DASHBOARD_OPS_SURFACE, getDefaultOpsPath } from "@/lib/ops/surface";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

export default async function DashboardSiparislerBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireOwnerTenantSlugMatch(slug, "/dashboard/siparisler");

  const features = getKasaFeatures(tenant);
  if (!features.dineIn && !features.pickup) {
    redirect(getDefaultOpsPath(features, DASHBOARD_OPS_SURFACE));
  }

  const reportDayConfig = {
    hoursDayMode: (tenant.hours_day_mode === "shift" ? "shift" : "calendar") as "calendar" | "shift",
    openTime: tenant.open_time,
    closeTime: tenant.close_time,
  };

  const [board, menu] = await Promise.all([
    loadKasaBoard(tenant.id, tenant.table_count ?? 0, {
      dineInEnabled: features.dineIn,
      pickupEnabled: features.pickup,
      dayOffset: 0,
      reportDayConfig,
    }),
    loadVisibleMenuForTenant(tenant.id),
  ]);

  return (
    <KasaPanelClient
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      tenantId={tenant.id}
      features={features}
      initialTables={board.ok ? board.board.tables : []}
      initialPickupSlots={board.ok ? board.board.pickupSlots : []}
      initialClosedOrders={board.ok ? board.board.closedOrders : []}
      initialDayStrip={board.ok ? board.board.dayStrip : []}
      initialDayModeLabel={board.ok ? board.board.dayModeLabel : "Takvim günü"}
      menu={menu}
      paymentFlags={tenantPaymentFlagsFromRow(tenant)}
      surface={DASHBOARD_OPS_SURFACE}
    />
  );
}
