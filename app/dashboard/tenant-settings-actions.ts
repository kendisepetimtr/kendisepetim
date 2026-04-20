"use server";

import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  normalizeTimeString,
  type BusinessHoursDayMode,
} from "@/lib/business-hours";
import { isValidGoogleMapsUrl, normalizeGoogleMapsUrl } from "@/lib/google-maps";
import { MAX_TENANT_LOGO_DATA_URL_LENGTH, type LocalTenantProfile } from "@/lib/local-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";
import { revalidatePath } from "next/cache";

const MAX_PUBLIC_DESCRIPTION_LENGTH = 280;

export type TenantSettingsPatch = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  logoDataUrl: string;
  coverImageUrl: string;
  publicDescription: string;
  googleMapsUrl: string;
  seoIndexEnabled: boolean;
  hoursDayMode: BusinessHoursDayMode;
  openTime: string;
  closeTime: string;
  paymentCash: boolean;
  paymentDoorCard: boolean;
  paymentMealCard: boolean;
};

export type UpdateTenantSettingsResult =
  | { ok: true; profile: LocalTenantProfile }
  | { ok: false; error: string };

export async function updateTenantBusinessSettingsAction(
  patch: TenantSettingsPatch,
): Promise<UpdateTenantSettingsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };
  }

  const businessName = patch.businessName.trim();
  const ownerName = patch.ownerName.trim();
  const email = patch.email.trim().toLowerCase();
  const phone = patch.phone.trim();
  if (!businessName || !ownerName || !email || !phone) {
    return { ok: false, error: "İşletme adı, yetkili adı, e-posta ve telefon zorunludur." };
  }

  const paymentCash = patch.paymentCash !== false;
  const paymentDoorCard = patch.paymentDoorCard === true;
  const paymentMealCard = patch.paymentMealCard === true;
  if (!paymentCash && !paymentDoorCard && !paymentMealCard) {
    return { ok: false, error: "QR sipariş için en az bir kapıda ödeme yöntemi seçmelisiniz." };
  }

  const hoursDayMode: BusinessHoursDayMode = patch.hoursDayMode === "shift" ? "shift" : "calendar";
  const openTime = normalizeTimeString(patch.openTime, DEFAULT_OPEN_TIME);
  const closeTime = normalizeTimeString(patch.closeTime, DEFAULT_CLOSE_TIME);

  const logoTrim = patch.logoDataUrl.trim();
  const logo_url = logoTrim.length > 0 ? logoTrim : null;
  if (logo_url && logo_url.length > MAX_TENANT_LOGO_DATA_URL_LENGTH) {
    return { ok: false, error: "Logo verisi çok büyük; daha küçük bir görsel kullanın." };
  }
  const coverImageUrl = patch.coverImageUrl.trim();
  const publicDescription = patch.publicDescription.trim().slice(0, MAX_PUBLIC_DESCRIPTION_LENGTH);
  const googleMapsUrl = normalizeGoogleMapsUrl(patch.googleMapsUrl);
  const seoIndexEnabled = patch.seoIndexEnabled === true;
  if (!isValidGoogleMapsUrl(googleMapsUrl)) {
    return { ok: false, error: "Lutfen gecerli bir Google Maps baglantisi girin." };
  }

  const { data: row, error: findErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (findErr || !row) {
    return { ok: false, error: "İşletme kaydı bulunamadı." };
  }

  const { data: updated, error: upErr } = await supabase
    .from("tenants")
    .update({
      business_name: businessName,
      owner_name: ownerName,
      email,
      phone,
      logo_url,
      cover_image_url: coverImageUrl || null,
      public_description: publicDescription,
      google_maps_url: googleMapsUrl || null,
      seo_index_enabled: seoIndexEnabled,
      hours_day_mode: hoursDayMode,
      open_time: openTime,
      close_time: closeTime,
      payment_cash: paymentCash,
      payment_door_card: paymentDoorCard,
      payment_meal_card: paymentMealCard,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (upErr || !updated) {
    return { ok: false, error: upErr?.message ?? "Kayıt güncellenemedi." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/m/${updated.subdomain}`);
  return { ok: true, profile: tenantRowToLocalProfile(updated as TenantRow) };
}
