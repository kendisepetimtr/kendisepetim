import "server-only";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Restaurant, UserRestaurantMembership } from "../../types";

export type CurrentRestaurantContext = {
  userId: string;
  membershipId: string;
  role: UserRestaurantMembership["role"];
  restaurant: Restaurant;
};

export async function getUserRestaurantMemberships(
  userId: string,
): Promise<UserRestaurantMembership[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("restaurant_members")
    .select(
      "id, restaurant_id, user_id, role, is_active, created_at, restaurants(id, name, slug, logo_url, brand_color, is_active, created_at)",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<UserRestaurantMembership[]>();

  if (error) {
    throw new Error(`Failed to fetch restaurant memberships: ${error.message}`);
  }

  return data ?? [];
}

export async function getCurrentRestaurantContext(): Promise<CurrentRestaurantContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const memberships = await getUserRestaurantMemberships(user.id);
  const firstValidMembership = memberships.find(
    (membership) => membership.restaurants?.is_active,
  );

  if (!firstValidMembership || !firstValidMembership.restaurants) {
    return null;
  }

  return {
    userId: user.id,
    membershipId: firstValidMembership.id,
    role: firstValidMembership.role,
    restaurant: firstValidMembership.restaurants,
  };
}

export async function assertRestaurantMembership(
  restaurantId: string,
): Promise<CurrentRestaurantContext> {
  const context = await getCurrentRestaurantContext();

  if (!context) {
    throw new Error("Unauthorized: no active restaurant membership.");
  }

  if (context.restaurant.id !== restaurantId) {
    throw new Error("Forbidden: restaurant scope mismatch.");
  }

  return context;
}
