"use server";

import { clampDeliveryRadiusKm, MARKETPLACE_MIN_PRODUCT_COUNT } from "@/lib/fulfillment";
import { isValidCoordinate } from "@/lib/geo";
import {
  canEnableMarketplace,
  CUISINE_TAG_OPTIONS,
  getMarketplaceQualityIssues,
  type MarketplaceProfileInput,
} from "@/lib/marketplace";
import { countMarketplaceProductForTenant } from "@/lib/marketplace-query";
import { LAUNCH_CITY, LAUNCH_DISTRICT, isValidNeighborhood } from "@/lib/turkey-geography";
import { MAX_TENANT_LOGO_DATA_URL_LENGTH, type LocalTenantProfile } from "@/lib/local-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";
import { revalidatePath } from "next/cache";

export type MarketplaceSettingsPatch = {
  marketplaceEnabled: boolean;
  city: string;
  district: string;
  neighborhood: string;
  cuisineTags: string[];
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number;
  fulfillmentPickupEnabled: boolean;
  fulfillmentDeliveryEnabled: boolean;
  minOrderAmount: number | null;
};

export type UpdateMarketplaceSettingsResult =
  | { ok: true; profile: LocalTenantProfile }
  | { ok: false; error: string };

function sanitizeCuisineTags(tags: string[]): string[] {
  const allowed = new Set<string>(CUISINE_TAG_OPTIONS);
  return [...new Set(tags.filter((t) => allowed.has(t)))];
}

async function loadTenantForOwner(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error || !row) return { error: "İşletme kaydı bulunamadı." as const, row: null };
  return { error: null, row: row as TenantRow };
}

export async function updateMarketplaceSettingsAction(
  patch: MarketplaceSettingsPatch,
): Promise<UpdateMarketplaceSettingsResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };

  const loaded = await loadTenantForOwner(user.id);
  if (loaded.error || !loaded.row) return { ok: false, error: loaded.error ?? "Kayıt bulunamadı." };
  const current = loaded.row;

  const fulfillmentPickupEnabled = patch.fulfillmentPickupEnabled !== false;
  const fulfillmentDeliveryEnabled = patch.fulfillmentDeliveryEnabled === true;
  if (!fulfillmentPickupEnabled && !fulfillmentDeliveryEnabled) {
    return { ok: false, error: "En az gel-al veya restoran teslimatı seçeneğini açmalısınız." };
  }

  const city = patch.city.trim() || LAUNCH_CITY;
  const district = patch.district.trim() || LAUNCH_DISTRICT;
  const neighborhood = patch.neighborhood.trim();
  const cuisineTags = sanitizeCuisineTags(patch.cuisineTags);
  const deliveryRadiusKm = clampDeliveryRadiusKm(patch.deliveryRadiusKm);
  const latitude = patch.latitude;
  const longitude = patch.longitude;

  if (!isValidCoordinate(latitude, longitude)) {
    return { ok: false, error: "Haritadan restoran konumunu işaretleyin." };
  }

  if (neighborhood && !isValidNeighborhood(city, district, neighborhood)) {
    return { ok: false, error: "Geçerli bir mahalle seçin." };
  }

  let minOrderAmount: number | null = null;
  if (patch.minOrderAmount != null && Number.isFinite(patch.minOrderAmount) && patch.minOrderAmount > 0) {
    minOrderAmount = Math.round(patch.minOrderAmount * 100) / 100;
  }

  const productCount = await countMarketplaceProductForTenant(current.id);
  const profileInput: MarketplaceProfileInput = {
    marketplaceEnabled: patch.marketplaceEnabled === true,
    city,
    district,
    neighborhood,
    cuisineTags,
    latitude,
    longitude,
    coverImageUrl: current.cover_image_url ?? "",
    logoUrl: current.logo_url ?? "",
    publicDescription: current.public_description ?? "",
    publicMenuEnabled: current.public_menu_enabled === true,
    fulfillmentPickupEnabled,
    fulfillmentDeliveryEnabled,
    productCount,
  };

  if (patch.marketplaceEnabled && !canEnableMarketplace(profileInput)) {
    const issues = getMarketplaceQualityIssues(profileInput);
    return {
      ok: false,
      error: `Marketplace için eksikler: ${issues.map((i) => i.label).join(", ")}`,
    };
  }

  const { data: updated, error: upErr } = await supabase
    .from("tenants")
    .update({
      marketplace_enabled: patch.marketplaceEnabled === true,
      city,
      district,
      neighborhood,
      cuisine_tags: cuisineTags,
      latitude,
      longitude,
      delivery_radius_km: deliveryRadiusKm,
      fulfillment_pickup_enabled: fulfillmentPickupEnabled,
      fulfillment_delivery_enabled: fulfillmentDeliveryEnabled,
      min_order_amount: minOrderAmount,
    })
    .eq("id", current.id)
    .select("*")
    .single();

  if (upErr || !updated) {
    return { ok: false, error: upErr?.message ?? "Kayıt güncellenemedi." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/kesfet");
  revalidatePath("/");
  revalidatePath(`/m/${updated.subdomain}`);
  return { ok: true, profile: tenantRowToLocalProfile(updated as TenantRow) };
}

export async function getMarketplaceQualityForOwnerAction(): Promise<
  { ok: true; issues: { key: string; label: string }[]; productCount: number } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum yok." };

  const loaded = await loadTenantForOwner(user.id);
  if (loaded.error || !loaded.row) return { ok: false, error: loaded.error ?? "Kayıt yok." };
  const row = loaded.row;
  const productCount = await countMarketplaceProductForTenant(row.id);

  const profileInput: MarketplaceProfileInput = {
    marketplaceEnabled: true,
    city: row.city ?? "",
    district: row.district ?? "",
    neighborhood: row.neighborhood ?? "",
    cuisineTags: row.cuisine_tags ?? [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    coverImageUrl: row.cover_image_url ?? "",
    logoUrl: row.logo_url ?? "",
    publicDescription: row.public_description ?? "",
    publicMenuEnabled: row.public_menu_enabled === true,
    fulfillmentPickupEnabled: row.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: row.fulfillment_delivery_enabled === true,
    productCount,
  };

  return {
    ok: true,
    issues: getMarketplaceQualityIssues(profileInput),
    productCount,
  };
}

export { MARKETPLACE_MIN_PRODUCT_COUNT };
