import { redirect } from "next/navigation";
import DeliveryOrderDetailClient from "@/components/kasa/delivery-order-detail-client";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import {
  loadKasaDeliveryOrderDetail,
  loadKasaDeliveryOrderHistoryDetail,
} from "@/lib/kasa/delivery-orders-service";
import { DASHBOARD_OPS_SURFACE, getDefaultOpsPath, opsPaketPath } from "@/lib/ops/surface";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = {
  params: Promise<{ slug: string; orderId: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function DashboardDeliveryOrderPage({ params, searchParams }: Props) {
  const { slug, orderId } = await params;
  const { view } = await searchParams;
  const tenant = await requireOwnerTenantSlugMatch(slug, "/dashboard/paket");

  const features = getKasaFeatures(tenant);
  if (!features.delivery) {
    redirect(getDefaultOpsPath(features, DASHBOARD_OPS_SURFACE));
  }

  const historyView = view === "history";
  const detail = historyView
    ? await loadKasaDeliveryOrderHistoryDetail(tenant.id, orderId)
    : await loadKasaDeliveryOrderDetail(tenant.id, orderId);

  if (!detail.ok) {
    redirect(opsPaketPath(DASHBOARD_OPS_SURFACE));
  }

  return (
    <DeliveryOrderDetailClient
      order={detail.order}
      couriers={detail.couriers}
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      paymentFlags={tenantPaymentFlagsFromRow(tenant)}
      readOnly={historyView || !detail.open}
      courierName={detail.courierName}
      surface={DASHBOARD_OPS_SURFACE}
    />
  );
}
