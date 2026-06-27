import { OWNER_ADMIN_COOKIE, ownerAdminCookieOptions } from "@/lib/owner-admin/session";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function signOutDashboardSession(): Promise<void> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut({ scope: "global" });
    }
    const jar = await cookies();
    jar.set(OWNER_ADMIN_COOKIE, "", { ...ownerAdminCookieOptions(), maxAge: 0 });
  } catch {
    /* çıkışta sessizce devam */
  }
}
