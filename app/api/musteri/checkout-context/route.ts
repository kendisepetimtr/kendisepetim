import { NextResponse } from "next/server";
import { ensureCustomerAccount } from "@/lib/account-kind";
import {
  getCustomerProfileByUserId,
  loadCustomerAddresses,
  type CustomerSavedAddress,
} from "@/lib/musteri/customer-profile";
import { getCustomerBlockState, CUSTOMER_BLOCKED_LOGIN_MESSAGE } from "@/lib/superadmin/customers-service";
import { withMusteriCors } from "@/lib/musteri/cors";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type MusteriCheckoutContextResponse =
  | { ok: true; kind: "guest" }
  | { ok: true; kind: "restaurant" | "unknown" }
  | {
      ok: true;
      kind: "customer";
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      addresses: CustomerSavedAddress[];
    }
  | { ok: false; error: string };

/** Menü siparişi: oturum açıksa profil + kayıtlı adresler. */
export async function GET(request: Request): Promise<NextResponse<MusteriCheckoutContextResponse>> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return withMusteriCors(NextResponse.json({ ok: true, kind: "guest" }), request);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return withMusteriCors(NextResponse.json({ ok: true, kind: "guest" }), request);

    const kind = await ensureCustomerAccount(user);
    if (kind !== "customer") {
      return withMusteriCors(NextResponse.json({ ok: true, kind: kind === "restaurant" ? "restaurant" : "unknown" }), request);
    }

    const block = await getCustomerBlockState(user.id);
    if (block.blocked) {
      return withMusteriCors(
        NextResponse.json({ ok: false, error: CUSTOMER_BLOCKED_LOGIN_MESSAGE }, { status: 403 }),
        request,
      );
    }

    const profile = await getCustomerProfileByUserId(user.id);
    const addresses = await loadCustomerAddresses(user.id);
    const meta = user.user_metadata ?? {};
    const firstName =
      profile?.firstName ||
      (typeof meta.first_name === "string" ? meta.first_name : "") ||
      "Müşteri";
    const lastName =
      profile?.lastName ||
      (typeof meta.last_name === "string" ? meta.last_name : "") ||
      "";

    return withMusteriCors(
      NextResponse.json({
        ok: true,
        kind: "customer",
        firstName,
        lastName,
        phone: profile?.phone || "",
        email: profile?.email || user.email || "",
        addresses,
      }),
      request,
    );
  } catch {
    return withMusteriCors(NextResponse.json({ ok: true, kind: "guest" }), request);
  }
}

export async function OPTIONS(request: Request) {
  return withMusteriCors(new NextResponse(null, { status: 204 }), request);
}
