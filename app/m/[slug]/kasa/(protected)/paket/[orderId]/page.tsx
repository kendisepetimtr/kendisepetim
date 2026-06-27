import { notFound, redirect } from "next/navigation";
import DeliveryOrderDetailClient from "@/components/kasa/delivery-order-detail-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { getDefaultKasaPath, getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadKasaDeliveryOrderDetail } from "@/lib/kasa/delivery-orders-service";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

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

  const paymentFlags: TenantPaymentFlags = {
    paymentCash: auth.tenant.payment_cash === true,
    paymentDoorCard: auth.tenant.payment_door_card === true,
    paymentMealCard: auth.tenant.payment_meal_card === true,
  };

  return (
    <DeliveryOrderDetailClient
      order={detail.order}
      couriers={detail.couriers}
      businessName={auth.tenant.business_name}
      paymentFlags={paymentFlags}
    />
  );
}
