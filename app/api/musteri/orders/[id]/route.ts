import { NextResponse } from "next/server";
import { loadCustomerOrderById } from "@/lib/musteri/orders-service";
import { loadMusteriSession } from "@/lib/musteri/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const session = await loadMusteriSession();
  if (session.kind !== "customer" || !session.userId) {
    return NextResponse.json({ ok: false, error: "Giriş gerekli." }, { status: 401 });
  }
  const { id } = await params;
  const order = await loadCustomerOrderById(session.userId, id);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Sipariş bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order });
}
