"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getOAuthSiteUrl, getRequestSiteUrl } from "@/lib/site-url";
import { buildAuthCallbackUrl, EMAIL_VERIFIED_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { resolveOwnerDashboardUrl } from "@/lib/owner-tenant";
import { normalizeTrBusinessPhone, normalizeTrPhone } from "@/lib/phone-tr";
import { defaultTrialEndsAt } from "@/lib/tenant-entitlements";
import { CUSTOMER_SESSION_BLOCKS_RESTAURANT_REGISTER, resolveAccountKind } from "@/lib/account-kind";
import { persistAuthIntent } from "@/lib/auth-intent-persist";
import { partnerPasswordError } from "@/lib/partner/password";
import { allocatePartnerSubdomain } from "@/lib/partner/slug";
import { PARTNER_PENDING_PATH, partnerAbsoluteUrl } from "@/lib/partner/host";
import { redirect } from "next/navigation";

export type RegisterActionState =
  | { error: string }
  | { needsEmailConfirm: true; email: string }
  | null;

function pendingTenantPayload(input: {
  businessName: string;
  subdomain: string;
  ownerName: string;
  ownerLastName: string;
  email: string;
  phone: string;
  businessPhone: string;
  hasDeviceInternet: boolean;
  fulfillmentPickup: boolean;
  fulfillmentDelivery: boolean;
  ownerUserId: string;
}) {
  return {
    business_name: input.businessName,
    subdomain: input.subdomain,
    owner_name: `${input.ownerName} ${input.ownerLastName}`.trim(),
    owner_last_name: input.ownerLastName,
    email: input.email,
    phone: input.phone,
    business_phone: input.businessPhone,
    business_type: "restaurant",
    branch_count: 1,
    has_device_internet: input.hasDeviceInternet,
    lighting_accepted_at: new Date().toISOString(),
    application_status: "pending",
    owner_user_id: input.ownerUserId,
    logo_url: null,
    hours_day_mode: "calendar",
    open_time: "09:00",
    close_time: "22:00",
    payment_cash: true,
    payment_door_card: false,
    payment_meal_card: false,
    payment_meal_card_brands: [],
    plan: "free",
    trial_ends_at: defaultTrialEndsAt(),
    public_menu_enabled: false,
    dashboard_enabled: false,
    marketplace_enabled: false,
    fulfillment_pickup_enabled: input.fulfillmentPickup,
    fulfillment_delivery_enabled: input.fulfillmentDelivery,
  };
}

export async function registerTenantAction(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  if (!getSupabaseEnv()) {
    return { error: "Sunucu yapılandırması eksik (Supabase)." };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerFirstName = String(formData.get("ownerFirstName") ?? "").trim();
  const ownerLastName = String(formData.get("ownerLastName") ?? "").trim();
  const emailFromForm = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const businessPhone = String(formData.get("businessPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordAgain = String(formData.get("passwordAgain") ?? "");
  const acceptedLighting = formData.get("acceptedLighting") === "on";
  const deliverySelf = formData.get("deliverySelf") === "on";
  const pickup = formData.get("pickup") === "on";
  const hasDeviceRaw = String(formData.get("hasDeviceInternet") ?? "");
  const hasDeviceInternet = hasDeviceRaw === "yes";

  if (!businessName) return { error: "Tabela adı zorunludur." };
  if (!ownerFirstName) return { error: "İşletme sahibi adı zorunludur." };
  if (!ownerLastName) return { error: "İşletme sahibi soyadı zorunludur." };
  const normalizedPhone = normalizeTrPhone(phone);
  if (!normalizedPhone) {
    return { error: "Geçerli bir Türkiye cep telefonu girin." };
  }
  const normalizedBusinessPhone = normalizeTrBusinessPhone(businessPhone);
  if (!normalizedBusinessPhone) {
    return { error: "Geçerli bir iş telefonu girin." };
  }
  if (!deliverySelf && !pickup) {
    return { error: "En az bir teslimat seçeneği işaretleyin (işletme teslimatı veya gel al)." };
  }
  if (hasDeviceRaw !== "yes" && hasDeviceRaw !== "no") {
    return { error: "Cihaz ve internet sorusunu yanıtlayın." };
  }
  if (!acceptedLighting) {
    return { error: "Devam etmek için aydınlatma metnini onaylayın." };
  }

  await persistAuthIntent("restaurant");

  let service;
  try {
    service = createServiceSupabaseClient();
  } catch {
    return {
      error:
        "Sunucu yapılandırması: SUPABASE_SERVICE_ROLE_KEY eksik (.env.local). Kayıt için service role anahtarı gerekir.",
    };
  }

  const subdomain = await allocatePartnerSubdomain(async (candidate) => {
    const { data } = await service.from("tenants").select("id").eq("subdomain", candidate).maybeSingle();
    return Boolean(data);
  }, businessName);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  const origin = await getRequestSiteUrl();
  const pendingUrl = partnerAbsoluteUrl(PARTNER_PENDING_PATH, origin);

  if (existingUser) {
    const email = (existingUser.email ?? emailFromForm).trim().toLowerCase();
    if (!email) {
      return { error: "E-posta adresi bulunamadı. Google hesabınızda e-posta paylaşımına izin verin." };
    }

    const kind = await resolveAccountKind(existingUser);
    if (kind === "customer") {
      return { error: CUSTOMER_SESSION_BLOCKS_RESTAURANT_REGISTER };
    }

    const { data: existingTenant } = await service
      .from("tenants")
      .select("id")
      .eq("owner_user_id", existingUser.id)
      .maybeSingle();
    if (existingTenant) {
      redirect(await resolveOwnerDashboardUrl(existingUser.id, origin));
    }

    const { error: insertError } = await service.from("tenants").insert(
      pendingTenantPayload({
        businessName,
        subdomain,
        ownerName: ownerFirstName,
        ownerLastName,
        email,
        phone: normalizedPhone,
        businessPhone: normalizedBusinessPhone,
        hasDeviceInternet,
        fulfillmentPickup: pickup,
        fulfillmentDelivery: deliverySelf,
        ownerUserId: existingUser.id,
      }),
    );

    if (insertError) {
      return { error: insertError.message || "İşletme kaydı oluşturulamadı." };
    }

    await supabase.auth.updateUser({ data: { account_kind: "restaurant" } });
    redirect(pendingUrl);
  }

  if (!emailFromForm) {
    return { error: "E-posta gerekli." };
  }
  const passwordErr = partnerPasswordError(password);
  if (passwordErr) return { error: passwordErr };
  if (password !== passwordAgain) return { error: "Şifreler eşleşmiyor." };

  const siteBase = await getOAuthSiteUrl();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: emailFromForm,
    password,
    options: {
      data: {
        business_name: businessName,
        subdomain,
        owner_name: `${ownerFirstName} ${ownerLastName}`.trim(),
        account_kind: "restaurant",
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

  const { error: insertError } = await service.from("tenants").insert(
    pendingTenantPayload({
      businessName,
      subdomain,
      ownerName: ownerFirstName,
      ownerLastName,
      email: emailFromForm,
      phone: normalizedPhone,
      businessPhone: normalizedBusinessPhone,
      hasDeviceInternet,
      fulfillmentPickup: pickup,
      fulfillmentDelivery: deliverySelf,
      ownerUserId: userId,
    }),
  );

  if (insertError) {
    return { error: insertError.message || "İşletme kaydı oluşturulamadı." };
  }

  if (signUpData.session) {
    redirect(pendingUrl);
  }

  return { needsEmailConfirm: true, email: emailFromForm };
}
