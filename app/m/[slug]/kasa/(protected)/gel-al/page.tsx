import { redirect } from "next/navigation";
import PickupOrdersClient from "@/components/kasa/pickup-orders-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadKasaPickupOrders } from "@/lib/kasa/pickup-orders-service";

export default async function KasaPickupOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) {
    return null;
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.pickup) {
    redirect("/kasa");
  }

  const result = await loadKasaPickupOrders(auth.tenant.id);

  return (
    <PickupOrdersClient
      businessName={auth.tenant.business_name}
      features={features}
      initialOrders={result.ok ? result.orders : []}
    />
  );
}
