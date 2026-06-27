import { NextResponse } from "next/server";
import { placeWaiterOrder } from "@/lib/garson/orders-service";
import { getAuthenticatedWaiterTenantByCookie } from "@/lib/garson/waiter-tenant";
import type { PublicOrderLineInput } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    tableNumber?: number;
    lines?: PublicOrderLineInput[];
    orderNote?: string;
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

  const auth = await getAuthenticatedWaiterTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Garson oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const result = await placeWaiterOrder({
    tenant: auth.tenant,
    tableNumber,
    lines: Array.isArray(body.lines) ? body.lines : [],
    orderNote: body.orderNote,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
