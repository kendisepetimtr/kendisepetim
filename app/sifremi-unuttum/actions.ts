"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type ForgotPasswordActionState = { error: string } | { success: true } | null;

export async function forgotPasswordAction(
  _prev: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  if (!getSupabaseEnv()) {
    return { error: "Sunucu yapılandırması eksik (Supabase)." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "E-posta gerekli." };
  }

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!siteBase) {
    return {
      error: "NEXT_PUBLIC_SITE_URL tanımlı değil; sıfırlama bağlantısı oluşturulamıyor.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteBase}/auth/callback?next=/sifre-yenile`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
