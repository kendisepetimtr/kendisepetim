import { NextResponse } from "next/server";
import { resolveAccountKind } from "@/lib/account-kind";
import {
  loadCustomerNotifications,
  markCustomerNotificationsRead,
} from "@/lib/musteri/notifications-service";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: true, items: [], unread: 0 });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true, items: [], unread: 0 });
    const kind = await resolveAccountKind(user);
    if (kind !== "customer") return NextResponse.json({ ok: true, items: [], unread: 0 });

    const items = await loadCustomerNotifications(user.id);
    const unread = items.filter((i) => !i.readAt).length;
    return NextResponse.json({ ok: true, items, unread });
  } catch {
    return NextResponse.json({ ok: true, items: [], unread: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: false }, { status: 401 });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const kind = await resolveAccountKind(user);
    if (kind !== "customer") return NextResponse.json({ ok: false }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as { action?: string; ids?: string[] };
    if (body.action === "mark_read") {
      await markCustomerNotificationsRead(user.id, body.ids);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
