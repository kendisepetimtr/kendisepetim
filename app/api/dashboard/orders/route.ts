import { NextResponse } from "next/server";
import {
  loadDashboardOrders,
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
  const channel = parseChannel(searchParams.get("channel"));
  const result = await loadDashboardOrders(channel);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  let body: { orderId?: string; status?: OrderStatus };
  try {
    body = (await request.json()) as { orderId?: string; status?: OrderStatus };
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.orderId || !body.status) {
    return NextResponse.json({ ok: false, error: "Sipariş ve durum gerekli." }, { status: 400 });
  }

  const result = await updateDashboardOrderStatus(body.orderId, body.status);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
