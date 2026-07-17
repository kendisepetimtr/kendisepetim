import { NextResponse } from "next/server";
import { loadKasaBoard } from "@/lib/kasa/board-service";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const features = getKasaFeatures(auth.tenant);
  if (!features.dineIn && !features.pickup) {
    return NextResponse.json({
      ok: true,
      businessName: auth.tenant.business_name,
      tableCount: 0,
      tables: [],
      pickupSlots: [],
      closedOrders: [],
      closedDayOffset: 0,
      dayStrip: [],
      dayModeLabel: "Takvim günü",
      features,
    });
  }

  const url = new URL(request.url);
  const dayOffsetRaw = Number(url.searchParams.get("dayOffset") ?? "0");
  const dayOffset = Number.isFinite(dayOffsetRaw) ? Math.max(0, Math.min(30, Math.floor(dayOffsetRaw))) : 0;

  const result = await loadKasaBoard(auth.tenant.id, auth.tenant.table_count ?? 0, {
    dineInEnabled: features.dineIn,
    pickupEnabled: features.pickup,
    dayOffset,
    reportDayConfig: {
      hoursDayMode: auth.tenant.hours_day_mode === "shift" ? "shift" : "calendar",
      openTime: auth.tenant.open_time,
      closeTime: auth.tenant.close_time,
    },
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    businessName: auth.tenant.business_name,
    tableCount: auth.tenant.table_count ?? 0,
    tables: result.board.tables,
    pickupSlots: result.board.pickupSlots,
    closedOrders: result.board.closedOrders,
    closedDayOffset: result.board.closedDayOffset,
    dayStrip: result.board.dayStrip,
    dayModeLabel: result.board.dayModeLabel,
    features,
  });
}
