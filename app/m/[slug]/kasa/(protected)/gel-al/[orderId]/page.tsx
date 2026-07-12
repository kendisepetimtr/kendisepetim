import { notFound, redirect } from "next/navigation";
import PickupOrderPaymentClient from "@/components/kasa/pickup-order-payment-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadKasaPickupOrderDetail } from "@/lib/kasa/pickup-orders-service";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; orderId: string }> };

/** Gel-al tahsilat — sipariş alma ana tahtadaki modalda. */
export default async function KasaPickupOrderPage({ params }: Props) {
  const { slug, orderId } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) notFound();

  const features = getKasaFeatures(auth.tenant);
  if (!features.pickup) {
    redirect("/kasa");
  }

  const detail = await loadKasaPickupOrderDetail(auth.tenant.id, orderId);
  if (!detail.ok) {
    redirect("/kasa");
  }

  const paymentFlags = tenantPaymentFlagsFromRow(auth.tenant);

  return (
    <PickupOrderPaymentClient
      order={detail.order}
      businessName={auth.tenant.business_name}
      paymentFlags={paymentFlags}
    />
  );
}
