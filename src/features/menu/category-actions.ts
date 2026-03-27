"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import { getCurrentRestaurantContext } from "../tenants";

function toOptionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toSortOrder(value: FormDataEntryValue | null): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function createCategory(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const sortOrder = toSortOrder(formData.get("sort_order"));

  if (!name) {
    throw new Error("Category name is required.");
  }

  const { error } = await supabase.from("categories").insert({
    restaurant_id: context.restaurant.id,
    name,
    description,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  revalidatePath("/dashboard/categories");
}

export async function updateCategory(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const categoryId = String(formData.get("category_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const sortOrder = toSortOrder(formData.get("sort_order"));

  if (!categoryId || !name) {
    throw new Error("Category id and name are required.");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      description,
      sort_order: sortOrder,
    })
    .eq("id", categoryId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`);
  }

  revalidatePath("/dashboard/categories");
}

export async function toggleCategoryActive(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const categoryId = String(formData.get("category_id") ?? "");
  const nextActiveRaw = String(formData.get("next_active") ?? "false");
  const nextActive = nextActiveRaw === "true";

  if (!categoryId) {
    throw new Error("Category id is required.");
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_active: nextActive })
    .eq("id", categoryId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to toggle category: ${error.message}`);
  }

  revalidatePath("/dashboard/categories");
}
