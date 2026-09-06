import { NextResponse } from "next/server";
import { withMusteriCors } from "@/lib/musteri/cors";
import { loadCustomerActiveOrder } from "@/lib/musteri/orders-service";
import { loadMusteriSession } from "@/lib/musteri/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await loadMusteriSession();
  if (session.kind !== "customer" || !session.userId) {
    return withMusteriCors(NextResponse.json({ ok: true, order: null }), request);
  }
  const order = await loadCustomerActiveOrder(session.userId);
  return withMusteriCors(NextResponse.json({ ok: true, order }), request);
}

export async function OPTIONS(request: Request) {
  return withMusteriCors(new NextResponse(null, { status: 204 }), request);
}
