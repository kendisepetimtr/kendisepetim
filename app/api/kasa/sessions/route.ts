import { NextResponse } from "next/server";
import { closeSessionWithPayment, loadKasaSessionDetail } from "@/lib/kasa/sessions-service";
import { getAuthenticatedOpsTenantByCookie } from "@/lib/ops/auth";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import { isCheckoutPaymentMethod, tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

export const dynamic = "force-dynamic";

function opsAuthStatus(error: string): number {
  return error === "Oturum gerekli." || error === "Admin PIN oturumu gerekli." ? 401 : 400;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableNumberRaw = searchParams.get("tableNumber");
  const tableNumber = tableNumberRaw != null ? Number.parseInt(tableNumberRaw, 10) : NaN;

  if (!Number.isFinite(tableNumber) || tableNumber < 1) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const auth = await getAuthenticatedOpsTenantByCookie();
  if (!auth.ok) {
    return NextResponse.json(auth, { status: opsAuthStatus(auth.error) });
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
        paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
      });
    }
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    empty: false,
    session: result.session,
    paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
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
  if (!isCheckoutPaymentMethod(paymentMethod)) {
    return NextResponse.json({ ok: false, error: "Ödeme yöntemi seçilmelidir." }, { status: 400 });
  }

  const auth = await getAuthenticatedOpsTenantByCookie();
  if (!auth.ok) {
    return NextResponse.json(auth, { status: opsAuthStatus(auth.error) });
  }

  if (tableNumber > (auth.tenant.table_count ?? 0)) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const result = await closeSessionWithPayment({
    tenantId: auth.tenant.id,
    tableNumber,
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
