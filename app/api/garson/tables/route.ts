import { NextResponse } from "next/server";
import { loadGarsonTableGrid, requestTableBill } from "@/lib/garson/tables-service";
import { getAuthenticatedWaiterTenantByCookie } from "@/lib/garson/waiter-tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedWaiterTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Garson oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const result = await loadGarsonTableGrid(auth.tenant.id, auth.tenant.table_count ?? 0);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    businessName: auth.tenant.business_name,
    tableCount: auth.tenant.table_count ?? 0,
    tables: result.tables,
  });
}

export async function PATCH(request: Request) {
  let body: { tableNumber?: number };
  try {
    body = (await request.json()) as { tableNumber?: number };
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

  if (tableNumber > (auth.tenant.table_count ?? 0)) {
    return NextResponse.json({ ok: false, error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const result = await requestTableBill(auth.tenant.id, tableNumber);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true, sessionId: result.sessionId });
}
