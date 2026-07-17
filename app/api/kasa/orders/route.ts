import { NextResponse } from "next/server";
import type { CustomerAddress } from "@/lib/customer-address";
import type { FulfillmentType } from "@/lib/fulfillment";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { placeCashierOrder } from "@/lib/kasa/orders-service";
import type { PublicOrderLineInput } from "@/lib/orders";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    fulfillmentType?: FulfillmentType;
    tableNumber?: number;
    lines?: PublicOrderLineInput[];
    orderNote?: string;
    courierNote?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: CustomerAddress;
    customerLatitude?: number | null;
    customerLongitude?: number | null;
    paymentMethod?: CheckoutPaymentMethod;
    mealCardBrandId?: MealCardBrandId;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const fulfillmentType = body.fulfillmentType;
  if (fulfillmentType !== "dine_in" && fulfillmentType !== "pickup" && fulfillmentType !== "delivery") {
    return NextResponse.json({ ok: false, error: "Geçersiz sipariş tipi." }, { status: 400 });
  }

  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const tableNumber =
    typeof body.tableNumber === "number" && Number.isFinite(body.tableNumber)
      ? Math.round(body.tableNumber)
      : undefined;

  const result = await placeCashierOrder({
    tenant: auth.tenant,
    fulfillmentType,
    tableNumber,
    lines: Array.isArray(body.lines) ? body.lines : [],
    orderNote: body.orderNote,
    courierNote: body.courierNote,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    email: body.email,
    address: body.address,
    customerLatitude: body.customerLatitude,
    customerLongitude: body.customerLongitude,
    paymentMethod: body.paymentMethod,
    mealCardBrandId: body.mealCardBrandId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
