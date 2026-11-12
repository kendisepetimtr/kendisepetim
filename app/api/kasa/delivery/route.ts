import { NextResponse } from "next/server";
import type { DeliveryStatus } from "@/lib/fulfillment";
import {
  assignCourierToDeliveryOrder,
  closeDeliveryOrderWithPayment,
  loadKasaClosedDeliveryOrders,
  loadKasaDeliveryOrderDetail,
  loadKasaDeliveryOrders,
  updateDeliveryOrderStatus,
} from "@/lib/kasa/delivery-orders-service";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { getAuthenticatedOpsTenantByCookie } from "@/lib/ops/auth";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import { isCheckoutPaymentMethod, tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

export const dynamic = "force-dynamic";

function opsAuthStatus(error: string): number {
  return error === "Oturum gerekli." || error === "Admin PIN oturumu gerekli." ? 401 : 400;
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedOpsTenantByCookie();
  if (!auth.ok) {
    return NextResponse.json(auth, { status: opsAuthStatus(auth.error) });
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    return NextResponse.json({ ok: false, error: "Paket siparişi kapalı." }, { status: 409 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (orderId) {
    const detail = await loadKasaDeliveryOrderDetail(auth.tenant.id, orderId);
    if (!detail.ok) {
      return NextResponse.json(detail, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      order: detail.order,
      couriers: detail.couriers,
      paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
    });
  }

  const scope = searchParams.get("scope");
  if (scope === "closed") {
    const result = await loadKasaClosedDeliveryOrders(auth.tenant.id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true, orders: result.orders });
  }

  const result = await loadKasaDeliveryOrders(auth.tenant.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true, orders: result.orders });
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    orderId?: string;
    courierId?: string;
    deliveryStatus?: DeliveryStatus;
    paymentMethod?: CheckoutPaymentMethod;
    mealCardBrandId?: MealCardBrandId;
    cancelReason?: unknown;
    cancelNote?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ ok: false, error: "Sipariş gerekli." }, { status: 400 });
  }

  const auth = await getAuthenticatedOpsTenantByCookie();
  if (!auth.ok) {
    return NextResponse.json(auth, { status: opsAuthStatus(auth.error) });
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.delivery) {
    return NextResponse.json({ ok: false, error: "Paket siparişi kapalı." }, { status: 409 });
  }

  const paymentFlags = tenantPaymentFlagsFromRow(auth.tenant);

  if (body.action === "assign-courier") {
    if (!body.courierId) {
      return NextResponse.json({ ok: false, error: "Kurye gerekli." }, { status: 400 });
    }
    const result = await assignCourierToDeliveryOrder({
      tenantId: auth.tenant.id,
      orderId: body.orderId,
      courierId: body.courierId,
      actor: auth.actor,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (body.action === "update-status") {
    if (!body.deliveryStatus) {
      return NextResponse.json({ ok: false, error: "Teslimat durumu gerekli." }, { status: 400 });
    }
    const result = await updateDeliveryOrderStatus({
      tenantId: auth.tenant.id,
      orderId: body.orderId,
      deliveryStatus: body.deliveryStatus,
      cancelReason: body.cancelReason,
      cancelNote: body.cancelNote,
      actor: auth.actor,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (body.action === "close" || !body.action) {
    const paymentMethod = body.paymentMethod;
    if (!isCheckoutPaymentMethod(paymentMethod)) {
      return NextResponse.json({ ok: false, error: "Ödeme yöntemi seçilmelidir." }, { status: 400 });
    }
    if (!body.courierId) {
      return NextResponse.json({ ok: false, error: "Teslim eden kuryeyi seçin." }, { status: 400 });
    }
    const result = await closeDeliveryOrderWithPayment({
      tenantId: auth.tenant.id,
      orderId: body.orderId,
      courierId: body.courierId,
      paymentMethod,
      mealCardBrandId: body.mealCardBrandId,
      paymentFlags,
      actor: auth.actor,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: "Geçersiz işlem." }, { status: 400 });
}
