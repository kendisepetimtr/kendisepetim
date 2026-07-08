"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getOAuthSiteUrl, getRequestSiteUrl } from "@/lib/site-url";
import { buildAuthCallbackUrl, EMAIL_VERIFIED_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { resolveOwnerDashboardUrl } from "@/lib/owner-tenant";
import { redirect } from "next/navigation";

export type RegisterActionState =
  | { error: string }
  | { needsEmailConfirm: true; email: string }
  | null;

function validateSubdomain(subdomain: string): string | null {
  if (subdomain.length < 2) return "Alt alan adı en az 2 karakter olmalıdır.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return "Alt alan adı yalnızca küçük harf, rakam ve tire içerebilir; tire ile başlayıp bitemez.";
  }
  return null;
}

export async function registerTenantAction(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  if (!getSupabaseEnv()) {
    return { error: "Sunucu yapılandırması eksik (Supabase)." };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const subdomain = String(formData.get("subdomain") ?? "")
    .trim()
    .toLowerCase();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const emailFromForm = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordAgain = String(formData.get("passwordAgain") ?? "");
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  if (!businessName || !ownerName || !phone) {
    return { error: "Zorunlu alanları doldurun." };
  }
  const subErr = validateSubdomain(subdomain);
  if (subErr) return { error: subErr };
  if (!acceptedTerms) return { error: "Devam etmek için kullanım şartlarını onaylayın." };

  let service;
  try {
    service = createServiceSupabaseClient();
  } catch {
    return {
      error:
        "Sunucu yapılandırması: SUPABASE_SERVICE_ROLE_KEY eksik (.env.local). Kayıt için service role anahtarı gerekir.",
    };
  }

  const { data: taken } = await service.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
  if (taken) {
    return { error: "Bu alt alan adı zaten kullanılıyor." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser) {
    const email = (existingUser.email ?? emailFromForm).trim().toLowerCase();
    if (!email) {
      return { error: "E-posta adresi bulunamadı. Google hesabınızda e-posta paylaşımına izin verin." };
    }

    const { data: existingTenant } = await service
      .from("tenants")
      .select("id")
      .eq("owner_user_id", existingUser.id)
      .maybeSingle();
    if (existingTenant) {
      const siteOrigin = await getRequestSiteUrl();
      redirect(await resolveOwnerDashboardUrl(existingUser.id, siteOrigin));
    }

    const { error: insertError } = await service.from("tenants").insert({
      business_name: businessName,
      subdomain,
      owner_name: ownerName,
      email,
      phone,
      owner_user_id: existingUser.id,
      logo_url: null,
      hours_day_mode: "calendar",
      open_time: "09:00",
      close_time: "22:00",
      payment_cash: true,
      payment_door_card: false,
      payment_meal_card: false,
    });

    if (insertError) {
      return { error: insertError.message || "İşletme kaydı oluşturulamadı." };
    }

    const siteOrigin = await getRequestSiteUrl();
    redirect(await resolveOwnerDashboardUrl(existingUser.id, siteOrigin));
  }

  if (!emailFromForm) {
    return { error: "E-posta gerekli." };
  }
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalıdır." };
  if (password !== passwordAgain) return { error: "Şifreler eşleşmiyor." };

  const siteBase = await getOAuthSiteUrl();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: emailFromForm,
    password,
    options: {
      data: {
        business_name: businessName,
        subdomain,
        owner_name: ownerName,
      },
      ...(siteBase
        ? { emailRedirectTo: buildAuthCallbackUrl(siteBase, EMAIL_VERIFIED_LOGIN_PATH) }
        : {}),
    },
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered")) {
      return { error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin." };
    }
    return { error: signUpError.message };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return { error: "Hesap oluşturulamadı. Lütfen tekrar deneyin." };
  }

  const { error: insertError } = await service.from("tenants").insert({
    business_name: businessName,
    subdomain,
    owner_name: ownerName,
    email: emailFromForm,
    phone,
    owner_user_id: userId,
    logo_url: null,
    hours_day_mode: "calendar",
    open_time: "09:00",
    close_time: "22:00",
    payment_cash: true,
    payment_door_card: false,
    payment_meal_card: false,
  });

  if (insertError) {
    return { error: insertError.message || "İşletme kaydı oluşturulamadı." };
  }

  if (signUpData.session) {
    const siteOrigin = await getRequestSiteUrl();
    redirect(await resolveOwnerDashboardUrl(userId, siteOrigin));
  }

  return { needsEmailConfirm: true, email: emailFromForm };
}
