import { NextResponse } from "next/server";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.dineIn) {
    return NextResponse.json({
      ok: true,
      businessName: auth.tenant.business_name,
      tableCount: 0,
      tables: [],
    });
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
