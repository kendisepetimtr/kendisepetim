import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient, tryCreateServerSupabaseClient } from "@/lib/supabase/server";

/** Virgülle ayrılmış izinli e-postalar. Örn: ks@admin.com,baska@ornek.com */
export function getSuperadminAllowedEmails(): string[] {
  const raw = process.env.SUPERADMIN_ALLOWED_EMAILS?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowed = getSuperadminAllowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(normalized);
}

export function isSuperadminAuthUser(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.app_metadata?.superadmin === true || user.app_metadata?.role === "superadmin") {
    return true;
  }
  return isSuperadminEmail(user.email);
}

export async function getSuperadminAuthUser(): Promise<User | null> {
  const supabase = await tryCreateServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperadminAuthUser(user)) return null;
  return user;
}

export async function requireSuperadminAuthUser(): Promise<User> {
  const user = await getSuperadminAuthUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/superadmin/giris");
  }
  return user as User;
}

export async function signInSuperadminWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: "E-posta ve şifre gerekli." };
  }

  const allowed = getSuperadminAllowedEmails();
  if (allowed.length === 0) {
    return {
      ok: false,
      error:
        "SUPERADMIN_ALLOWED_EMAILS tanımlı değil. Vercel / .env.local içine ks@admin.com ekleyin.",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error || !data.user) {
      return { ok: false, error: "E-posta veya şifre hatalı." };
    }

    if (!isSuperadminAuthUser(data.user)) {
      await supabase.auth.signOut();
      return { ok: false, error: "Bu hesap süperadmin yetkisine sahip değil." };
    }

    return { ok: true, user: data.user };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Giriş yapılamadı.",
    };
  }
}

export async function signOutSuperadmin(): Promise<void> {
  const supabase = await tryCreateServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
