import { redirect } from "next/navigation";
import DeliveryOrdersClient from "@/components/kasa/delivery-orders-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadActiveCouriers, loadKasaDeliveryOrders } from "@/lib/kasa/delivery-orders-service";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function KasaDeliveryOrdersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    redirect(getDefaultKasaPath(features));
  }

  const [ordersResult, couriersResult, menu] = await Promise.all([
    loadKasaDeliveryOrders(auth.tenant.id),
    loadActiveCouriers(auth.tenant.id),
    loadVisibleMenuForTenant(auth.tenant.id),
  ]);

  const courierById: Record<string, CourierRow> = {};
  if (couriersResult.ok) {
    for (const c of couriersResult.couriers) {
      courierById[c.id] = c;
    }
  }

  return (
    <DeliveryOrdersClient
      businessName={auth.tenant.business_name}
      subdomain={auth.tenant.subdomain}
      tenantId={auth.tenant.id}
      features={features}
      initialOrders={ordersResult.ok ? ordersResult.orders : []}
      courierById={courierById}
      menu={menu}
      paymentFlags={tenantPaymentFlagsFromRow(auth.tenant)}
      initialTab={tab === "history" ? "history" : "active"}
    />
  );
}
