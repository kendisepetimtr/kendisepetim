"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase";

function buildRegisterErrorUrl(message: string) {
  return `/register?error=${encodeURIComponent(message)}`;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export async function registerWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!email || !password) {
    redirect(buildRegisterErrorUrl("E-posta ve sifre zorunludur."));
  }
  if (password.length < 6) {
    redirect(buildRegisterErrorUrl("Sifre en az 6 karakter olmalidir."));
  }
  if (password !== passwordConfirm) {
    redirect(buildRegisterErrorUrl("Sifreler eslesmiyor."));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/onboarding/restaurant`,
    },
  });

  if (error) {
    redirect(buildRegisterErrorUrl(error.message || "Kayit basarisiz."));
  }

  if (data.session) {
    redirect("/onboarding/restaurant");
  }

  redirect(
    "/login?registered=1&message=" +
      encodeURIComponent(
        "Kayit alindi. E-postanizdaki dogrulama baglantisina tiklayin; ardindan otomatik olarak restoran kurulumuna yonlendirileceksiniz.",
      ),
  );
}
