import "server-only";
import { createAnonServerSupabaseClient, createServerSupabaseClient } from "../../lib/supabase";
import type { Restaurant } from "../../types";
import { mapRestaurantFromDb, type RestaurantRow } from "./restaurant-map";

export type GetRestaurantBySlugOptions = {
  /** true: oturumdan bağımsız anon okuma (tenant menü / subdomain) */
  storefront?: boolean;
};

export async function getRestaurantBySlug(
  slug: string,
  options?: GetRestaurantBySlugOptions,
): Promise<Restaurant | null> {
  const supabase = options?.storefront
    ? createAnonServerSupabaseClient()
    : await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch restaurant by slug: ${error.message}`);
  }

  return data ? mapRestaurantFromDb(data as RestaurantRow) : null;
}
