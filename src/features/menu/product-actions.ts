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

function toPrice(value: FormDataEntryValue | null): number {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Price must be a valid non-negative number.");
  }
  return Number(parsed.toFixed(2));
}

export async function createProduct(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const imageUrl = toOptionalText(formData.get("image_url"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const price = toPrice(formData.get("price"));
  const sortOrder = toSortOrder(formData.get("sort_order"));

  if (!name || !categoryId) {
    throw new Error("Product name and category are required.");
  }

  const { error } = await supabase.from("products").insert({
    restaurant_id: context.restaurant.id,
    category_id: categoryId,
    name,
    description,
    image_url: imageUrl,
    price,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  revalidatePath("/dashboard/products");
}

export async function updateProduct(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const productId = String(formData.get("product_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const imageUrl = toOptionalText(formData.get("image_url"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const price = toPrice(formData.get("price"));
  const sortOrder = toSortOrder(formData.get("sort_order"));

  if (!productId || !name || !categoryId) {
    throw new Error("Product id, name and category are required.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name,
      description,
      image_url: imageUrl,
      price,
      sort_order: sortOrder,
    })
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }

  revalidatePath("/dashboard/products");
}

export async function toggleProductActive(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  const productId = String(formData.get("product_id") ?? "").trim();
  const nextActive = String(formData.get("next_active") ?? "false") === "true";

  if (!productId) {
    throw new Error("Product id is required.");
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: nextActive })
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Failed to toggle product: ${error.message}`);
  }

  revalidatePath("/dashboard/products");
}
