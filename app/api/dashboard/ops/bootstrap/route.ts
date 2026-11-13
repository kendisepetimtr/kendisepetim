import { NextResponse } from "next/server";
import { loadKasaBoard } from "@/lib/kasa/board-service";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { loadVisibleMenuForTenant } from "@/lib/kasa/menu-load";
import { getAuthenticatedOwnerTenantByCookie } from "@/lib/ops/auth";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthenticatedOwnerTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Oturum gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const features = getKasaFeatures(auth.tenant);
  const url = new URL(request.url);
  const dayOffsetRaw = Number(url.searchParams.get("dayOffset") ?? "0");
  const dayOffset = Number.isFinite(dayOffsetRaw) ? Math.max(0, Math.min(30, Math.floor(dayOffsetRaw))) : 0;

  const reportDayConfig = {
    hoursDayMode: (auth.tenant.hours_day_mode === "shift" ? "shift" : "calendar") as "calendar" | "shift",
    openTime: auth.tenant.open_time,
    closeTime: auth.tenant.close_time,
  };

  const [board, menu] = await Promise.all([
    features.dineIn || features.pickup
      ? loadKasaBoard(auth.tenant.id, auth.tenant.table_count ?? 0, {
          dineInEnabled: features.dineIn,
          pickupEnabled: features.pickup,
          dayOffset,
          reportDayConfig,
        })
      : Promise.resolve({ ok: true as const, board: null }),
    loadVisibleMenuForTenant(auth.tenant.id),
  ]);

  if (!board.ok) {
    return NextResponse.json(board, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    tenantId: auth.tenant.id,
    businessName: auth.tenant.business_name,
    subdomain: auth.tenant.subdomain,
    features,
    paymentFlags: tenantPaymentFlagsFromRow(auth.tenant),
    menu,
    tables: board.board?.tables ?? [],
    pickupSlots: board.board?.pickupSlots ?? [],
    closedOrders: board.board?.closedOrders ?? [],
    dayStrip: board.board?.dayStrip ?? [],
    dayModeLabel: board.board?.dayModeLabel ?? "Takvim günü",
    closedDayOffset: board.board?.closedDayOffset ?? dayOffset,
  });
}
