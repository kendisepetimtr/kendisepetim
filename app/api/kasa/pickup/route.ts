import { NextResponse } from "next/server";
import {
  cancelKasaPickupOrder,
  closePickupOrderWithPayment,
  loadKasaPickupOrderDetail,
  loadKasaPickupOrders,
} from "@/lib/kasa/pickup-orders-service";
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
  if (!features.pickup) {
    return NextResponse.json({ ok: false, error: "Gel-al siparişi kapalı." }, { status: 409 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (orderId) {
    const detail = await loadKasaPickupOrderDetail(auth.tenant.id, orderId);
    if (!detail.ok) {
      return NextResponse.json(detail, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      order: detail.order,
      paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
    });
  }

  const result = await loadKasaPickupOrders(auth.tenant.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    orders: result.orders,
  });
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    orderId?: string;
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
  if (!features.pickup) {
    return NextResponse.json({ ok: false, error: "Gel-al siparişi kapalı." }, { status: 409 });
  }

  if (body.action === "cancel") {
    const result = await cancelKasaPickupOrder({
      tenantId: auth.tenant.id,
      orderId: body.orderId,
      reason: body.cancelReason,
      note: body.cancelNote,
      actor: auth.actor,
    });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }

  const paymentMethod = body.paymentMethod;
  if (!isCheckoutPaymentMethod(paymentMethod)) {
    return NextResponse.json({ ok: false, error: "Ödeme yöntemi seçilmelidir." }, { status: 400 });
  }

  const result = await closePickupOrderWithPayment({
    tenantId: auth.tenant.id,
    orderId: body.orderId,
    paymentMethod,
    mealCardBrandId: body.mealCardBrandId,
    paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
    actor: auth.actor,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
