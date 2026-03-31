import "server-only";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Customer } from "../../types";
import { getCurrentRestaurantContext } from "../tenants";

export async function getCustomersForCurrentRestaurant(): Promise<Customer[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, restaurant_id, full_name, phone, delivery_address, created_at")
    .eq("restaurant_id", context.restaurant.id)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<Customer[]>();

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("does not exist") || msg.includes("schema cache")) return [];
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }
  return data ?? [];
}
