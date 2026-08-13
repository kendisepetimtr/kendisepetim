import { NextResponse } from "next/server";
import { resolveAccountKind } from "@/lib/account-kind";
import {
  deleteCustomerFavorite,
  loadCustomerFavorites,
  upsertCustomerFavorite,
} from "@/lib/musteri/favorites-service";
import type { FavoriteKind } from "@/lib/guest-favorites";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: true, kind: "guest", items: [] });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true, kind: "guest", items: [] });
    const accountKind = await resolveAccountKind(user);
    if (accountKind !== "customer") return NextResponse.json({ ok: true, kind: "guest", items: [] });
    const items = await loadCustomerFavorites(user.id);
    return NextResponse.json({ ok: true, kind: "customer", items });
  } catch {
    return NextResponse.json({ ok: true, kind: "guest", items: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });
    const accountKind = await resolveAccountKind(user);
    if (accountKind !== "customer") {
      return NextResponse.json({ ok: false, error: "Müşteri hesabı gerekli." }, { status: 403 });
    }

    const body = (await request.json()) as {
      action?: "add" | "remove";
      kind?: FavoriteKind;
      subdomain?: string;
      productId?: string;
      productName?: string;
      restaurantName?: string;
    };

    const kind = body.kind === "product" ? "product" : "restaurant";
    const subdomain = String(body.subdomain ?? "").trim().toLowerCase();
    if (!subdomain) return NextResponse.json({ ok: false, error: "Restoran gerekli." }, { status: 400 });

    if (body.action === "remove") {
      const res = await deleteCustomerFavorite({
        userId: user.id,
        kind,
        subdomain,
        productId: body.productId,
      });
      if (!res.ok) return NextResponse.json(res, { status: 400 });
      return NextResponse.json({ ok: true, favorited: false });
    }

    const res = await upsertCustomerFavorite({
      userId: user.id,
      kind,
      subdomain,
      productId: body.productId,
      productName: body.productName,
      restaurantName: body.restaurantName || subdomain,
    });
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    return NextResponse.json({ ok: true, favorited: true, id: res.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Favori kaydedilemedi." },
      { status: 500 },
    );
  }
}
