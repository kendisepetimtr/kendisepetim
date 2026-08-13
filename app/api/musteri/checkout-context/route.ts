import { NextResponse } from "next/server";
import { resolveAccountKind } from "@/lib/account-kind";
import {
  getCustomerProfileByUserId,
  loadCustomerAddresses,
  type CustomerSavedAddress,
} from "@/lib/musteri/customer-profile";
import { getCustomerBlockState, CUSTOMER_BLOCKED_LOGIN_MESSAGE } from "@/lib/superadmin/customers-service";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type MusteriCheckoutContextResponse =
  | { ok: true; kind: "guest" }
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
export async function GET(): Promise<NextResponse<MusteriCheckoutContextResponse>> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return NextResponse.json({ ok: true, kind: "guest" });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true, kind: "guest" });

    const kind = await resolveAccountKind(user);
    if (kind !== "customer") return NextResponse.json({ ok: true, kind: "guest" });

    const block = await getCustomerBlockState(user.id);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: CUSTOMER_BLOCKED_LOGIN_MESSAGE }, { status: 403 });
    }

    const profile = await getCustomerProfileByUserId(user.id);
    const addresses = await loadCustomerAddresses(user.id);
    const meta = user.user_metadata ?? {};
    const firstName =
      profile?.firstName ||
      (typeof meta.first_name === "string" ? meta.first_name : "") ||
      "";
    const lastName =
      profile?.lastName ||
      (typeof meta.last_name === "string" ? meta.last_name : "") ||
      "";

    return NextResponse.json({
      ok: true,
      kind: "customer",
      firstName,
      lastName,
      phone: profile?.phone || "",
      email: profile?.email || user.email || "",
      addresses,
    });
  } catch {
    return NextResponse.json({ ok: true, kind: "guest" });
  }
}
