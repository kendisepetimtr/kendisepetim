"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export type ResetPasswordActionState = { error: string } | null;

export async function resetPasswordAction(
  _prev: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  if (!getSupabaseEnv()) {
    return { error: "Sunucu yapılandırması eksik (Supabase)." };
  }

  const password = String(formData.get("password") ?? "");
  const passwordAgain = String(formData.get("passwordAgain") ?? "");

  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalıdır." };
  }
  if (password !== passwordAgain) {
    return { error: "Şifreler eşleşmiyor." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum bulunamadı. E-postanızdaki sıfırlama bağlantısını tekrar açın." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  await supabase.auth.signOut();
  redirect("/giris?durum=sifre-guncellendi");
}
