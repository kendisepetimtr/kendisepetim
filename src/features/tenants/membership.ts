import "server-only";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Restaurant, UserRestaurantMembership } from "../../types";
import { mapRestaurantFromDb, type RestaurantRow } from "./restaurant-map";

export type CurrentRestaurantContext = {
  userId: string;
  membershipId: string;
  role: UserRestaurantMembership["role"];
  restaurant: Restaurant;
};

export type MembershipWithRestaurantRow = Omit<UserRestaurantMembership, "restaurants"> & {
  restaurants: RestaurantRow | null;
};

export async function getUserRestaurantMemberships(
  userId: string,
): Promise<MembershipWithRestaurantRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("restaurant_members")
    .select(
      // restaurants(*) — patch öncesi DB'de olmayan kolonlar için; yalnızca mevcut sütunlar döner.
      "id, restaurant_id, user_id, role, is_active, created_at, restaurants(*)",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<MembershipWithRestaurantRow[]>();

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
    restaurant: mapRestaurantFromDb(firstValidMembership.restaurants as RestaurantRow),
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
