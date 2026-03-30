import "server-only";
import { createAnonServerSupabaseClient, createServerSupabaseClient } from "../../lib/supabase";
import { buildProductImagesPublicUrl } from "../../lib/supabase/storage-public-url";
import { assertRestaurantMembership, getCurrentRestaurantContext } from "../tenants";
import type { Category, Product } from "../../types";

export type StorefrontQueryOptions = {
  storefront?: boolean;
};

/** Patch öncesi DB'lerde kolon yoksa bile `select('*')` çalışır; eksik alanlar varsayılanlanır. */
type ProductRow = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | string;
  delivery_price?: number | string | null;
  use_delivery_price?: boolean | null;
  ingredients?: unknown;
  image_url: string | null;
  image_storage_path?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

function mapDbProduct(row: ProductRow): Product {
  const ing = row.ingredients;
  const ingredients = Array.isArray(ing)
    ? ing.filter((x): x is string => typeof x === "string").map((s) => s.trim())
    : [];
  const storagePath = row.image_storage_path ?? null;
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    delivery_price: row.delivery_price != null ? Number(row.delivery_price) : null,
    use_delivery_price: Boolean(row.use_delivery_price),
    ingredients,
    image_url: storagePath ? buildProductImagesPublicUrl(storagePath) : row.image_url,
    image_storage_path: storagePath,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function getCategoriesByRestaurantId(
  restaurantId: string,
  options?: StorefrontQueryOptions,
): Promise<Category[]> {
  const supabase = options?.storefront
    ? createAnonServerSupabaseClient()
    : await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, restaurant_id, name, description, sort_order, is_active, created_at")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Category[]>();

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveProductsByRestaurantId(
  restaurantId: string,
  options?: StorefrontQueryOptions,
): Promise<Product[]> {
  const supabase = options?.storefront
    ? createAnonServerSupabaseClient()
    : await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active products: ${error.message}`);
  }

  return ((data ?? []) as ProductRow[]).map(mapDbProduct);
}

export async function getProductsByRestaurantId(
  restaurantId: string,
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return ((data ?? []) as ProductRow[]).map(mapDbProduct);
}

export async function getDashboardCategoriesForCurrentRestaurant(): Promise<Category[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  return getCategoriesByRestaurantId(context.restaurant.id);
}

export async function getDashboardActiveProductsForCurrentRestaurant(): Promise<Product[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  return getActiveProductsByRestaurantId(context.restaurant.id);
}

export async function getDashboardProductsForCurrentRestaurant(): Promise<Product[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized: login and active restaurant membership required.");
  }

  return getProductsByRestaurantId(context.restaurant.id);
}

export async function getDashboardCategoriesByRestaurantId(
  restaurantId: string,
): Promise<Category[]> {
  await assertRestaurantMembership(restaurantId);
  return getCategoriesByRestaurantId(restaurantId);
}

export async function getDashboardActiveProductsByRestaurantId(
  restaurantId: string,
): Promise<Product[]> {
  await assertRestaurantMembership(restaurantId);
  return getActiveProductsByRestaurantId(restaurantId);
}

export async function getDashboardProductsByRestaurantId(
  restaurantId: string,
): Promise<Product[]> {
  await assertRestaurantMembership(restaurantId);
  return getProductsByRestaurantId(restaurantId);
}
