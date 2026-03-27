"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase";

function buildLoginErrorUrl(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(buildLoginErrorUrl("E-posta ve sifre zorunludur."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(buildLoginErrorUrl("Giris basarisiz. Bilgilerinizi kontrol edin."));
  }

  redirect("/dashboard");
}
