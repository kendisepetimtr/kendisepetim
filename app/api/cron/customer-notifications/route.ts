import { NextResponse } from "next/server";
import { deliverDueCustomerNotifications } from "@/lib/musteri/notifications-service";

export const dynamic = "force-dynamic";

/** Vercel cron: otomatik ETA bildirimlerini teslim et. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const delivered = await deliverDueCustomerNotifications();
  return NextResponse.json({ ok: true, delivered });
}
