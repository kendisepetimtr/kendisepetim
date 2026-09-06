"use server";

import {
  updateMarketplaceSettings,
  type MarketplaceSettingsPatch,
  type UpdateMarketplaceSettingsResult,
} from "@/lib/dashboard/marketplace-settings";
import { MARKETPLACE_MIN_PRODUCT_COUNT } from "@/lib/fulfillment";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import {
  getMarketplaceQualityIssues,
  type MarketplaceProfileInput,
} from "@/lib/marketplace";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { MarketplaceSettingsPatch, UpdateMarketplaceSettingsResult };

/** @deprecated Panelde `/api/dashboard/marketplace` kullanın (RSC yenilemesi yok). */
export async function updateMarketplaceSettingsAction(
  patch: MarketplaceSettingsPatch,
): Promise<UpdateMarketplaceSettingsResult> {
  return updateMarketplaceSettings(patch);
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
      openTime: row.open_time ?? "",
      closeTime: row.close_time ?? "",
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
