import "server-only";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Restaurant } from "../../types";

export async function getRestaurantBySlug(
  slug: string,
): Promise<Restaurant | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, brand_color, is_active, created_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<Restaurant>();

  if (error) {
    throw new Error(`Failed to fetch restaurant by slug: ${error.message}`);
  }

  return data;
}
