import { NextResponse } from "next/server";
import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { loadGarsonTableGrid } from "@/lib/garson/tables-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  const tableCount = tenant.table_count ?? 0;
  if (!tenant.dine_in_enabled || tableCount < 1) {
    return NextResponse.json({
      ok: true,
      tableCount: 0,
      activeCount: 0,
      dineInEnabled: false,
    });
  }

  const grid = await loadGarsonTableGrid(tenant.id, tableCount);
  if (!grid.ok) {
    return NextResponse.json({ ok: false, error: grid.error }, { status: 400 });
  }

  const activeCount = grid.tables.filter(
    (t) => t.status === "active" || t.status === "bill_requested",
  ).length;

  return NextResponse.json({
    ok: true,
    tableCount,
    activeCount,
    dineInEnabled: true,
  });
}
