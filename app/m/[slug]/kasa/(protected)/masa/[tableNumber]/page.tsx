import { notFound } from "next/navigation";
import KasaPosClient from "@/components/kasa/kasa-pos-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { loadKasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; tableNumber: string }> };

function parseTableNumber(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 200) return null;
  return n;
}

export default async function KasaTablePosPage({ params }: Props) {
  const { slug, tableNumber: rawTable } = await params;
  const tableNumber = parseTableNumber(rawTable);
  if (tableNumber == null) notFound();

  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) notFound();

  if (tableNumber > (auth.tenant.table_count ?? 0)) notFound();

  const detail = await loadKasaSessionDetail(auth.tenant.id, tableNumber);
  const session = detail.ok ? detail.session : null;

  const row = auth.tenant;
  const paymentFlags: TenantPaymentFlags = {
    paymentCash: row.payment_cash === true,
    paymentDoorCard: row.payment_door_card === true,
    paymentMealCard: row.payment_meal_card === true,
  };
  const fulfillmentFlags: TenantFulfillmentFlags = {
    fulfillmentPickupEnabled: false,
    fulfillmentDeliveryEnabled: false,
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
      channel="dine_in"
      tableNumber={tableNumber}
      backHref="/kasa"
      backLabel="Masalar"
      initialSession={session}
    />
  );
}
