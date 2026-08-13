"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { describeSupabaseEnvGap } from "@/lib/supabase/env";
import { humanizeLoginError } from "@/lib/auth-errors";
import { getOwnerTenantByUserId, resolveOwnerDashboardUrl } from "@/lib/owner-tenant";
import { getRequestSiteUrl } from "@/lib/site-url";
import { CUSTOMER_ACCOUNT_ON_RESTAURANT_LOGIN, resolveAccountKind } from "@/lib/account-kind";
import { redirect } from "next/navigation";

export type LoginActionState = { error: string } | null;

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const envGap = describeSupabaseEnvGap();
  if (envGap) {
    return {
      error: `Giriş yapılamıyor: ${envGap}. Supabase ortam değişkenlerini kontrol edin.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli." };
  }

  const supabase = await createServerSupabaseClient();

  // Önceki oturumu temizle — yanlış hesapla karışmasın
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* devam */
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: humanizeLoginError(error.message) };
  }

  const userId = signInData.user?.id;
  if (!userId) {
    return { error: "E-posta veya şifre hatalı. Bu bilgilerle kayıtlı hesap bulunamadı." };
  }

  const kind = await resolveAccountKind(signInData.user);
  if (kind === "customer") {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* devam */
    }
    return { error: CUSTOMER_ACCOUNT_ON_RESTAURANT_LOGIN };
  }

  if (next === "/dashboard" || next.startsWith("/dashboard/")) {
    const tenant = await getOwnerTenantByUserId(userId);
    if (!tenant) {
      redirect("/kayit?reason=tenant-missing");
    }
    const siteOrigin = await getRequestSiteUrl();
    redirect(await resolveOwnerDashboardUrl(userId, siteOrigin));
  }

  redirect(next);
}
