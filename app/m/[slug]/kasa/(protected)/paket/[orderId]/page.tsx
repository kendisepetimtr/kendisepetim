import { notFound, redirect } from "next/navigation";
import KasaPosClient from "@/components/kasa/kasa-pos-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadKasaDeliveryOrderDetail } from "@/lib/kasa/delivery-orders-service";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; orderId: string }> };

export default async function KasaDeliveryOrderPage({ params }: Props) {
  const { slug, orderId } = await params;
  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) notFound();

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    redirect(getDefaultKasaPath(features));
  }

  const detail = await loadKasaDeliveryOrderDetail(auth.tenant.id, orderId);
  if (!detail.ok) {
    redirect("/kasa/paket");
  }

  const row = auth.tenant;
  const paymentFlags = tenantPaymentFlagsFromRow(row);
  const fulfillmentFlags: TenantFulfillmentFlags = {
    fulfillmentPickupEnabled: false,
    fulfillmentDeliveryEnabled: true,
    deliveryRadiusKm: clampDeliveryRadiusKm(Number(row.delivery_radius_km ?? 5)),
    minOrderAmount:
      row.min_order_amount != null && Number.isFinite(Number(row.min_order_amount))
        ? Number(row.min_order_amount)
        : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };

  const initialMenu = await loadVisibleMenuForTenant(row.id);

  return (
    <KasaPosClient
      slug={slug}
      tenantId={row.id}
      businessName={row.business_name}
      businessLogoUrl={row.logo_url ?? ""}
      businessCoverImageUrl={row.cover_image_url ?? ""}
      hoursPair={{ open: row.open_time, close: row.close_time }}
      initialOpenStatus={isBusinessOpenNow(row.open_time, row.close_time)}
      initialClosedMessage={getBusinessClosedMessage(row.open_time, row.close_time)}
      paymentFlags={paymentFlags}
      fulfillmentFlags={fulfillmentFlags}
      initialMenu={initialMenu}
      channel="delivery"
      backHref="/kasa/paket"
      backLabel="Paket"
      initialOrder={detail.order}
    />
  );
}
