"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { describeSupabaseEnvGap, getSupabaseEnv } from "@/lib/supabase/env";
import { getOAuthSiteUrl } from "@/lib/site-url";
import { buildAuthCallbackUrl, RESET_PASSWORD_PATH } from "@/lib/supabase/auth-urls";

export type ForgotPasswordActionState = { error: string } | { success: true } | null;

function forgotPasswordErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("email rate")) {
    return "E-posta gönderim limiti aşıldı. Supabase’in varsayılan e-posta servisi saatte çok az mail gönderir (geliştirme içindir). Yaklaşık 1 saat bekleyin veya Supabase → Authentication → SMTP bölümünden kendi SMTP’nizi (Resend, SendGrid vb.) bağlayın.";
  }
  return message;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const envGap = describeSupabaseEnvGap();
  if (envGap) {
    return {
      error: `Supabase yapılandırması eksik: ${envGap}. .env.local (yerel) veya Vercel Environment Variables (canlı) içine ekleyin; ardından sunucuyu yeniden başlatın / yeniden deploy edin.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "E-posta gerekli." };
  }

  const siteBase = await getOAuthSiteUrl();
  if (!siteBase) {
    return {
      error: "Site adresi belirlenemedi; NEXT_PUBLIC_SITE_URL tanımlayın.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl(siteBase, RESET_PASSWORD_PATH),
  });

  if (error) {
    return { error: forgotPasswordErrorMessage(error.message) };
  }

  return { success: true };
}
