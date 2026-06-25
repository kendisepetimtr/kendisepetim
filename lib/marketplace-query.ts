import { isBusinessOpenNow } from "@/lib/business-hours";
import { LAUNCH_CITY, LAUNCH_DISTRICT } from "@/lib/turkey-geography";
import {
  canEnableMarketplace,
  type MarketplaceListing,
  type MarketplaceProfileInput,
} from "@/lib/marketplace";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { MenuProductRow } from "@/lib/supabase/menu-types";
import type { TenantRow } from "@/lib/supabase/tenant-types";

function tenantToProfileInput(
  tenant: TenantRow,
  productCount: number,
): MarketplaceProfileInput {
  return {
    marketplaceEnabled: tenant.marketplace_enabled === true,
    city: tenant.city ?? "",
    district: tenant.district ?? "",
    neighborhood: tenant.neighborhood ?? "",
    cuisineTags: tenant.cuisine_tags ?? [],
    latitude: tenant.latitude ?? null,
    longitude: tenant.longitude ?? null,
    coverImageUrl: tenant.cover_image_url ?? "",
    logoUrl: tenant.logo_url ?? "",
    publicDescription: tenant.public_description ?? "",
    publicMenuEnabled: tenant.public_menu_enabled !== false,
    fulfillmentPickupEnabled: tenant.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: tenant.fulfillment_delivery_enabled === true,
    productCount,
  };
}

function pickSignatureDish(products: MenuProductRow[]): { name: string; price: number } | null {
  const signature = products.find((p) => p.signature_dish === true);
  if (!signature) return null;
  return {
    name: signature.name,
    price: signature.use_package_price ? Number(signature.package_price) : Number(signature.price),
  };
}

function rowToListing(tenant: TenantRow, productCount: number, products: MenuProductRow[]): MarketplaceListing | null {
  const profile = tenantToProfileInput(tenant, productCount);
  if (!canEnableMarketplace(profile) || tenant.marketplace_enabled !== true) return null;

  const signature = pickSignatureDish(products);
  return {
    id: tenant.id,
    subdomain: tenant.subdomain,
    businessName: tenant.business_name,
    logoUrl: tenant.logo_url?.trim() ?? "",
    coverImageUrl: tenant.cover_image_url?.trim() ?? "",
    publicDescription: tenant.public_description?.trim() ?? "",
    neighborhood: tenant.neighborhood?.trim() ?? "",
    cuisineTags: tenant.cuisine_tags ?? [],
    deliveryRadiusKm: Number(tenant.delivery_radius_km ?? 5),
    fulfillmentPickupEnabled: tenant.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: tenant.fulfillment_delivery_enabled === true,
    isOpen: isBusinessOpenNow(tenant.open_time, tenant.close_time),
    signatureDishName: signature?.name ?? null,
    signatureDishPrice: signature?.price ?? null,
  };
}

export type MarketplaceListFilters = {
  neighborhood?: string;
  cuisineTag?: string;
  openOnly?: boolean;
  search?: string;
};

export async function fetchMarketplaceListings(
  filters: MarketplaceListFilters = {},
): Promise<MarketplaceListing[]> {
  let svc;
  try {
    svc = createServiceSupabaseClient();
  } catch {
    return [];
  }

  const { data: tenants, error } = await svc
    .from("tenants")
    .select("*")
    .eq("marketplace_enabled", true)
    .eq("public_menu_enabled", true)
    .eq("city", LAUNCH_CITY)
    .eq("district", LAUNCH_DISTRICT)
    .neq("neighborhood", "")
    .order("business_name", { ascending: true });

  if (error || !tenants?.length) return [];

  const tenantRows = tenants as TenantRow[];
  const tenantIds = tenantRows.map((t) => t.id);

  const { data: productRows } = await svc
    .from("menu_products")
    .select("tenant_id, name, price, package_price, use_package_price, signature_dish, hidden")
    .in("tenant_id", tenantIds)
    .eq("hidden", false);

  const productsByTenant = new Map<string, MenuProductRow[]>();
  for (const row of (productRows ?? []) as MenuProductRow[]) {
    const list = productsByTenant.get(row.tenant_id) ?? [];
    list.push(row);
    productsByTenant.set(row.tenant_id, list);
  }

  let listings = tenantRows
    .map((tenant) => {
      const products = productsByTenant.get(tenant.id) ?? [];
      return rowToListing(tenant, products.length, products);
    })
    .filter((item): item is MarketplaceListing => item != null);

  if (filters.neighborhood?.trim()) {
    listings = listings.filter((l) => l.neighborhood === filters.neighborhood!.trim());
  }
  if (filters.cuisineTag?.trim()) {
    const tag = filters.cuisineTag.trim();
    listings = listings.filter((l) => l.cuisineTags.includes(tag));
  }
  if (filters.openOnly) {
    listings = listings.filter((l) => l.isOpen);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLocaleLowerCase("tr");
    listings = listings.filter(
      (l) =>
        l.businessName.toLocaleLowerCase("tr").includes(q) ||
        l.publicDescription.toLocaleLowerCase("tr").includes(q) ||
        l.neighborhood.toLocaleLowerCase("tr").includes(q),
    );
  }

  listings.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (Boolean(a.signatureDishName) !== Boolean(b.signatureDishName)) {
      return a.signatureDishName ? -1 : 1;
    }
    return a.businessName.localeCompare(b.businessName, "tr");
  });

  return listings;
}

export async function countMarketplaceProductForTenant(tenantId: string): Promise<number> {
  const svc = createServiceSupabaseClient();
  const { count } = await svc
    .from("menu_products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("hidden", false);
  return count ?? 0;
}
