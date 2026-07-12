import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  normalizeTimeString,
  type BusinessHoursDayMode,
} from "@/lib/business-hours";
import { isValidGoogleMapsUrl, normalizeGoogleMapsUrl } from "@/lib/google-maps";
import { MAX_TENANT_LOGO_DATA_URL_LENGTH, type LocalTenantProfile } from "@/lib/local-tenant";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { slimTenantProfileForClient } from "@/lib/tenant-client-sync";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";
import { parseMealCardBrandIds, type MealCardBrandId } from "@/lib/tenant-payment";
import { revalidatePath } from "next/cache";

const MAX_PUBLIC_DESCRIPTION_LENGTH = 280;

const TENANT_SETTINGS_COLUMNS = [
  "business_name",
  "subdomain",
  "owner_name",
  "email",
  "phone",
  "created_at",
  "logo_url",
  "cover_image_url",
  "public_description",
  "google_maps_url",
  "seo_index_enabled",
  "public_menu_enabled",
  "hours_day_mode",
  "open_time",
  "close_time",
  "payment_cash",
  "payment_door_card",
  "payment_meal_card",
  "payment_meal_card_brands",
  "marketplace_enabled",
  "city",
  "district",
  "neighborhood",
  "cuisine_tags",
  "latitude",
  "longitude",
  "delivery_radius_km",
  "fulfillment_pickup_enabled",
  "fulfillment_delivery_enabled",
  "min_order_amount",
  "table_count",
  "dine_in_enabled",
].join(", ");

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
  paymentMealCardBrands: MealCardBrandId[];
};

export type UpdateTenantSettingsResult =
  | { ok: true; profile: LocalTenantProfile }
  | { ok: false; error: string };

export async function updateTenantBusinessSettings(
  patch: TenantSettingsPatch,
): Promise<UpdateTenantSettingsResult> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase bağlantısı kurulamadı." };

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
    const paymentMealCardBrands = paymentMealCard
      ? parseMealCardBrandIds(patch.paymentMealCardBrands)
      : [];
    if (!paymentCash && !paymentDoorCard && !paymentMealCard) {
      return { ok: false, error: "QR sipariş için en az bir kapıda ödeme yöntemi seçmelisiniz." };
    }
    if (paymentMealCard && paymentMealCardBrands.length === 0) {
      return { ok: false, error: "Yemek kartı açıksa en az bir kart markası seçmelisiniz." };
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
        payment_meal_card_brands: paymentMealCardBrands,
      })
      .eq("id", row.id)
      .select(TENANT_SETTINGS_COLUMNS)
      .single();

    if (upErr || !updated) {
      return { ok: false, error: upErr?.message ?? "Kayıt güncellenemedi." };
    }

    const tenantRow = updated as unknown as TenantRow;
    revalidatePath(`/m/${tenantRow.subdomain}`);

    const profile = slimTenantProfileForClient(tenantRowToLocalProfile(tenantRow));
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kayıt güncellenemedi.",
    };
  }
}
