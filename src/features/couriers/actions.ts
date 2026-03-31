"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import type { Courier } from "../../types";
import { getCurrentRestaurantContext } from "../tenants";

export async function getCouriersForCurrentRestaurant(): Promise<Courier[]> {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("couriers")
    .select("id, restaurant_id, first_name, last_name, phone, pos_number, is_active, created_at")
    .eq("restaurant_id", context.restaurant.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<Courier[]>();

  if (error) {
    if (error.message.toLowerCase().includes("does not exist") || error.message.includes("schema cache")) {
      return [];
    }
    throw new Error(`Kuryeler yüklenemedi: ${error.message}`);
  }

  return data ?? [];
}

export async function createCourier(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const posNumber = String(formData.get("pos_number") ?? "").trim() || null;

  if (!firstName || !lastName) {
    throw new Error("Ad ve soyad zorunludur.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("couriers").insert({
    restaurant_id: context.restaurant.id,
    first_name: firstName,
    last_name: lastName,
    phone,
    pos_number: posNumber,
    is_active: true,
  });

  if (error) {
    throw new Error(`Kurye eklenemedi: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/orders");
}

export async function deactivateCourier(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("courier_id") ?? "").trim();
  if (!id) {
    throw new Error("Geçersiz kurye.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("couriers")
    .update({ is_active: false })
    .eq("id", id)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Kurye güncellenemedi: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/orders");
}
