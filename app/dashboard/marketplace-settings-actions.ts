"use server";

import { clampDeliveryRadiusKm, MARKETPLACE_MIN_PRODUCT_COUNT } from "@/lib/fulfillment";
import { isValidCoordinate, normalizeGeoPoint } from "@/lib/geo";
import {
  canEnableMarketplace,
  CUISINE_TAG_OPTIONS,
  getMarketplaceQualityIssues,
  type MarketplaceProfileInput,
} from "@/lib/marketplace";
import { LAUNCH_CITY, LAUNCH_DISTRICT, isValidNeighborhood } from "@/lib/turkey-geography";
import type { LocalTenantProfile } from "@/lib/local-tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

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

function formatSaveError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("latitude") ||
    lower.includes("longitude") ||
    lower.includes("marketplace_enabled") ||
    lower.includes("fulfillment_") ||
    lower.includes("delivery_radius") ||
    lower.includes("schema cache") ||
    lower.includes("column")
  ) {
    return `${message}\n\nMarketplace migration SQL'i Supabase'de çalıştırıldı mı? (20260413120000_marketplace_and_fulfillment.sql)`;
  }
  return message;
}

async function loadTenantForOwner(supabase: SupabaseClient, userId: string) {
  const { data: row, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) return { error: error.message, row: null as TenantRow | null };
  if (!row) return { error: "İşletme kaydı bulunamadı.", row: null as TenantRow | null };
  return { error: null, row: row as TenantRow };
}

async function countProductsForTenant(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("menu_products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("hidden", false);
  if (error) return 0;
  return count ?? 0;
}

export async function updateMarketplaceSettingsAction(
  patch: MarketplaceSettingsPatch,
): Promise<UpdateMarketplaceSettingsResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Oturum bulunamadı. Tekrar giriş yapın." };

    const loaded = await loadTenantForOwner(supabase, user.id);
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

    const rawLat = typeof patch.latitude === "number" ? patch.latitude : Number(patch.latitude);
    const rawLng = typeof patch.longitude === "number" ? patch.longitude : Number(patch.longitude);
    if (!isValidCoordinate(rawLat, rawLng)) {
      return { ok: false, error: "Haritadan restoran konumunu işaretleyin." };
    }
    const { lat: latitude, lng: longitude } = normalizeGeoPoint({ lat: rawLat, lng: rawLng });

    if (neighborhood && !isValidNeighborhood(city, district, neighborhood)) {
      return { ok: false, error: "Geçerli bir mahalle seçin." };
    }

    let minOrderAmount: number | null = null;
    if (patch.minOrderAmount != null && Number.isFinite(patch.minOrderAmount) && patch.minOrderAmount > 0) {
      minOrderAmount = Math.round(patch.minOrderAmount * 100) / 100;
    }

    const productCount = await countProductsForTenant(supabase, current.id);
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
      publicMenuEnabled: current.public_menu_enabled !== false,
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
      return { ok: false, error: formatSaveError(upErr?.message ?? "Kayıt güncellenemedi.") };
    }

    revalidatePath("/dashboard");
    revalidatePath("/kesfet");
    revalidatePath("/");
    revalidatePath(`/m/${updated.subdomain}`);
    return { ok: true, profile: tenantRowToLocalProfile(updated as TenantRow) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kayıt güncellenemedi.";
    return { ok: false, error: formatSaveError(message) };
  }
}

export async function getMarketplaceQualityForOwnerAction(): Promise<
  { ok: true; issues: { key: string; label: string }[]; productCount: number } | { ok: false; error: string }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Oturum yok." };

    const loaded = await loadTenantForOwner(supabase, user.id);
    if (loaded.error || !loaded.row) return { ok: false, error: loaded.error ?? "Kayıt yok." };
    const row = loaded.row;
    const productCount = await countProductsForTenant(supabase, row.id);

    const profileInput: MarketplaceProfileInput = {
      marketplaceEnabled: true,
      city: row.city ?? "",
      district: row.district ?? "",
      neighborhood: row.neighborhood ?? "",
      cuisineTags: row.cuisine_tags ?? [],
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      coverImageUrl: row.cover_image_url ?? "",
      logoUrl: row.logo_url ?? "",
      publicDescription: row.public_description ?? "",
      publicMenuEnabled: row.public_menu_enabled !== false,
      fulfillmentPickupEnabled: row.fulfillment_pickup_enabled !== false,
      fulfillmentDeliveryEnabled: row.fulfillment_delivery_enabled === true,
      productCount,
    };

    return {
      ok: true,
      issues: getMarketplaceQualityIssues(profileInput),
      productCount,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kalite kontrolü yapılamadı.",
    };
  }
}

export { MARKETPLACE_MIN_PRODUCT_COUNT };
