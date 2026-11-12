import { redirect } from "next/navigation";
import PickupOrderPaymentClient from "@/components/kasa/pickup-order-payment-client";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import {
  loadKasaPickupOrderDetail,
  loadKasaPickupOrderHistoryDetail,
} from "@/lib/kasa/pickup-orders-service";
import { ADMIN_OPS_SURFACE, opsSiparislerPath } from "@/lib/ops/surface";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = {
  params: Promise<{ slug: string; orderId: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminPickupOrderPage({ params, searchParams }: Props) {
  const { slug, orderId } = await params;
  const { view } = await searchParams;
  const tenant = await requireOwnerTenantSlugMatch(slug);

  const features = getKasaFeatures(tenant);
  if (!features.pickup) {
    redirect(opsSiparislerPath(ADMIN_OPS_SURFACE));
  }

  const historyView = view === "history";
  const detail = historyView
    ? await loadKasaPickupOrderHistoryDetail(tenant.id, orderId)
    : await loadKasaPickupOrderDetail(tenant.id, orderId);

  if (!detail.ok) {
    redirect(opsSiparislerPath(ADMIN_OPS_SURFACE));
  }

  return (
    <PickupOrderPaymentClient
      order={detail.order}
      businessName={tenant.business_name}
      subdomain={tenant.subdomain}
      paymentFlags={tenantPaymentFlagsFromRow(tenant)}
      readOnly={historyView}
      surface={ADMIN_OPS_SURFACE}
    />
  );
}
