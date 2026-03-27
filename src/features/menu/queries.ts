import "server-only";
import { createServerSupabaseClient } from "../../lib/supabase";
import { assertRestaurantMembership, getCurrentRestaurantContext } from "../tenants";
import type { Category, Product } from "../../types";

export async function getCategoriesByRestaurantId(
  restaurantId: string,
): Promise<Category[]> {
  const supabase = await createServerSupabaseClient();

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
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, restaurant_id, category_id, name, description, price, image_url, sort_order, is_active, created_at",
    )
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Product[]>();

  if (error) {
    throw new Error(`Failed to fetch active products: ${error.message}`);
  }

  return data ?? [];
}

export async function getProductsByRestaurantId(
  restaurantId: string,
): Promise<Product[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, restaurant_id, category_id, name, description, price, image_url, sort_order, is_active, created_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Product[]>();

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data ?? [];
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
