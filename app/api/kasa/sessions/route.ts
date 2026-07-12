import { NextResponse } from "next/server";
import { closeSessionWithPayment, loadKasaSessionDetail } from "@/lib/kasa/sessions-service";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableNumberRaw = searchParams.get("tableNumber");
  const tableNumber = tableNumberRaw != null ? Number.parseInt(tableNumberRaw, 10) : NaN;

  if (!Number.isFinite(tableNumber) || tableNumber < 1) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  if (tableNumber > (auth.tenant.table_count ?? 0)) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const result = await loadKasaSessionDetail(auth.tenant.id, tableNumber);
  if (!result.ok) {
    if (result.error === "Bu masada açık oturum yok.") {
      return NextResponse.json({
        ok: true,
        empty: true,
        session: null,
        paymentFlags: {
          paymentCash: auth.tenant.payment_cash === true,
          paymentDoorCard: auth.tenant.payment_door_card === true,
          paymentMealCard: auth.tenant.payment_meal_card === true,
        },
      });
    }
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    empty: false,
    session: result.session,
    paymentFlags: {
      paymentCash: auth.tenant.payment_cash === true,
      paymentDoorCard: auth.tenant.payment_door_card === true,
      paymentMealCard: auth.tenant.payment_meal_card === true,
    },
  });
}

export async function POST(request: Request) {
  let body: {
    tableNumber?: number;
    paymentMethod?: CheckoutPaymentMethod;
    mealCardBrandId?: MealCardBrandId;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const tableNumber =
    typeof body.tableNumber === "number" && Number.isFinite(body.tableNumber)
      ? Math.round(body.tableNumber)
      : null;

  if (tableNumber == null || tableNumber < 1) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const paymentMethod = body.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "door_card" && paymentMethod !== "meal_card") {
    return NextResponse.json({ ok: false, error: "Ödeme yöntemi seçilmelidir." }, { status: 400 });
  }

  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  if (tableNumber > (auth.tenant.table_count ?? 0)) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const result = await closeSessionWithPayment({
    tenantId: auth.tenant.id,
    tableNumber,
    paymentMethod,
    mealCardBrandId: body.mealCardBrandId,
    paymentFlags: {
      paymentCash: auth.tenant.payment_cash === true,
      paymentDoorCard: auth.tenant.payment_door_card === true,
      paymentMealCard: auth.tenant.payment_meal_card === true,
    },
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
