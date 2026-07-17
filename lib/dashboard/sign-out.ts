import { OWNER_ADMIN_COOKIE, ownerAdminCookieOptions } from "@/lib/owner-admin/session";
import {
  getSharedAuthCookieDomain,
  withSharedAuthCookieOptions,
} from "@/lib/supabase/cookie-options";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

async function requestHostname(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim() ?? "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** Supabase + patron admin oturumunu kapatır; paylaşılan domain çerezlerini de temizler. */
export async function signOutDashboardSession(): Promise<void> {
  const hostname = await requestHostname();
  const jar = await cookies();

  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut({ scope: "global" });
    }
  } catch {
    /* devam */
  }

  // Bilinen auth çerezlerini domain ile sil (middleware setAll kaçırsa bile)
  const domain = getSharedAuthCookieDomain(hostname);
  const clearBase = {
    path: "/",
    maxAge: 0,
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    ...(domain ? { domain } : {}),
  };

  for (const c of jar.getAll()) {
    if (
      c.name.startsWith("sb-") ||
      c.name.includes("auth-token") ||
      c.name === OWNER_ADMIN_COOKIE
    ) {
      jar.set(c.name, "", withSharedAuthCookieOptions(clearBase, hostname));
    }
  }

  jar.set(OWNER_ADMIN_COOKIE, "", {
    ...ownerAdminCookieOptions(),
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

/** Panel çıkış — oturumu kapatıp giriş sayfasına yönlendirir. */
export async function signOutDashboardAndRedirect(): Promise<void> {
  await signOutDashboardSession();
  redirect("/giris");
}
