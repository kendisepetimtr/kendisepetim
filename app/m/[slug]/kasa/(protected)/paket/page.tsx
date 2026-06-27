import { redirect } from "next/navigation";
import DeliveryOrdersClient from "@/components/kasa/delivery-orders-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadActiveCouriers, loadKasaDeliveryOrders } from "@/lib/kasa/delivery-orders-service";
import type { CourierRow } from "@/lib/supabase/courier-types";

export default async function KasaDeliveryOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    redirect(getDefaultKasaPath(features));
  }

  const [ordersResult, couriersResult] = await Promise.all([
    loadKasaDeliveryOrders(auth.tenant.id),
    loadActiveCouriers(auth.tenant.id),
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
      features={features}
      initialOrders={ordersResult.ok ? ordersResult.orders : []}
      courierById={courierById}
    />
  );
}
