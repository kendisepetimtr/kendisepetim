import { NextResponse } from "next/server";
import {
  clearAllOrdersData,
  loadDashboardOrderById,
  loadDashboardOrders,
  markDashboardOrderSeen,
  updateDashboardOrderStatus,
  type OrderChannelFilter,
} from "@/lib/dashboard/orders-service";
import type { OrderStatus } from "@/lib/supabase/order-types";
import type { FulfillmentType } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

function parseChannel(raw: string | null): OrderChannelFilter {
  if (raw === "pickup" || raw === "delivery" || raw === "dine_in") return raw as FulfillmentType;
  return "all";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();
  if (orderId) {
    const result = await loadDashboardOrderById(orderId);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json({ ok: true, order: result.orders[0] ?? null });
  }

  const channel = parseChannel(searchParams.get("channel"));
  const result = await loadDashboardOrders(channel);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  let body: {
    orderId?: string;
    status?: OrderStatus;
    action?: string;
    cancelReason?: unknown;
    cancelNote?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ ok: false, error: "Sipariş gerekli." }, { status: 400 });
  }

  if (body.action === "seen") {
    const result = await markDashboardOrderSeen(body.orderId);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (!body.status) {
    return NextResponse.json({ ok: false, error: "Sipariş ve durum gerekli." }, { status: 400 });
  }

  const result = await updateDashboardOrderStatus(body.orderId, body.status, {
    reason: body.cancelReason,
    note: body.cancelNote,
  });
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

/** Sipariş / oturum / log sıfırlama — menü ve müşteri verisine dokunulmaz. */
export async function POST(request: Request) {
  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (body.action !== "clearAll") {
    return NextResponse.json({ ok: false, error: "Geçersiz sipariş işlemi." }, { status: 400 });
  }

  const result = await clearAllOrdersData();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
