"use server";

import { OWNER_ADMIN_COOKIE, ownerAdminCookieOptions } from "@/lib/owner-admin/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function signOutFromDashboard(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "global" });
  const jar = await cookies();
  jar.set(OWNER_ADMIN_COOKIE, "", { ...ownerAdminCookieOptions(), maxAge: 0 });
  revalidatePath("/", "layout");
}
