import { notFound, redirect } from "next/navigation";
import DeliveryOrderDetailClient from "@/components/kasa/delivery-order-detail-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import {
  loadKasaDeliveryOrderDetail,
  loadKasaDeliveryOrderHistoryDetail,
} from "@/lib/kasa/delivery-orders-service";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; orderId: string }>; searchParams: Promise<{ view?: string }> };

export default async function KasaDeliveryOrderPage({ params, searchParams }: Props) {
  const { slug, orderId } = await params;
  const { view } = await searchParams;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) notFound();

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    redirect(getDefaultKasaPath(features));
  }

  const historyView = view === "history";
  const detail = historyView
    ? await loadKasaDeliveryOrderHistoryDetail(auth.tenant.id, orderId)
    : await loadKasaDeliveryOrderDetail(auth.tenant.id, orderId);

  if (!detail.ok) {
    redirect("/kasa/paket");
  }

  return (
    <DeliveryOrderDetailClient
      order={detail.order}
      couriers={detail.couriers}
      businessName={auth.tenant.business_name}
      paymentFlags={tenantPaymentFlagsFromRow(auth.tenant)}
      readOnly={historyView || !detail.open}
      courierName={detail.courierName}
    />
  );
}
