import { redirect } from "next/navigation";
import DeliveryOrdersClient from "@/components/kasa/delivery-orders-client";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadActiveCouriers, loadKasaDeliveryOrders } from "@/lib/kasa/delivery-orders-service";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { DASHBOARD_OPS_SURFACE, getDefaultOpsPath } from "@/lib/ops/surface";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function DashboardDeliveryOrdersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const tenant = await requireOwnerTenantSlugMatch(slug, "/dashboard/paket");

  const features = getKasaFeatures(tenant);
  if (!features.delivery) {
    redirect(getDefaultOpsPath(features, DASHBOARD_OPS_SURFACE));
  }

  const [ordersResult, couriersResult, menu] = await Promise.all([
    loadKasaDeliveryOrders(tenant.id),
    loadActiveCouriers(tenant.id),
    loadVisibleMenuForTenant(tenant.id),
  ]);

  const courierById: Record<string, CourierRow> = {};
  if (couriersResult.ok) {
    for (const c of couriersResult.couriers) {
      courierById[c.id] = c;
    }
  }

  return (
    <DeliveryOrdersClient
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      tenantId={tenant.id}
      features={features}
      initialOrders={ordersResult.ok ? ordersResult.orders : []}
      courierById={courierById}
      menu={menu}
      paymentFlags={tenantPaymentFlagsFromRow(tenant)}
      initialTab={tab === "history" ? "history" : "active"}
      surface={DASHBOARD_OPS_SURFACE}
    />
  );
}
