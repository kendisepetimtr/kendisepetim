"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { describeSupabaseEnvGap } from "@/lib/supabase/env";
import { humanizeLoginError } from "@/lib/auth-errors";
import { redirect } from "next/navigation";

export type LoginActionState = { error: string } | null;

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const envGap = describeSupabaseEnvGap();
  if (envGap) {
    return {
      error: `Giris yapilamiyor: ${envGap}. Supabase ortam degiskenlerini kontrol edin.`,
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  if (!email || !password) {
    return { error: "E-posta ve sifre gerekli." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: humanizeLoginError(error.message) };
  }

  redirect(next);
}
