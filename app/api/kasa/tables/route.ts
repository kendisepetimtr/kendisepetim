import { NextResponse } from "next/server";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
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
