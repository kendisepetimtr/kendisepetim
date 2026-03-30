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

function menuRevalidatePaths(restaurantSlug: string) {
  revalidatePath("/dashboard/menu-management");
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  revalidatePath(`/t/${restaurantSlug}`);
}

function mapDbError(message: string): string {
  if (message.includes("row-level security") || message.includes("RLS")) {
    return (
      `${message} — Supabase tarafinda authenticated rol icin categories INSERT politikasi gerekir. ` +
      "Projedeki supabase/patches/fix-categories-products-rls-split-policies.sql dosyasini SQL Editorde calistirin; " +
      "restaurant_members tablosunda bu restoran ve auth.uid() için aktif üyelik satırı olduğundan emin olun."
    );
  }
  return message;
}

export async function createCategory(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum bulunamadı. Çıkış yapıp tekrar giriş yapın.");
  }
  if (user.id !== context.userId) {
    throw new Error("Oturum ve restoran bağlamı uyuşmuyor. Sayfayı yenileyin.");
  }
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));

  if (!name) {
    throw new Error("Category name is required.");
  }

  const { data: minRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("restaurant_id", context.restaurant.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const sortOrder = minRow !== null ? minRow.sort_order - 1 : 0;

  const { error } = await supabase.from("categories").insert({
    restaurant_id: context.restaurant.id,
    name,
    description,
    sort_order: sortOrder,
    is_active: true,
  });

  if (error) {
    throw new Error(`Failed to create category: ${mapDbError(error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
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
    throw new Error(`Failed to update category: ${mapDbError(error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function reorderCategories(orderedIds: string[]) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== context.userId) {
    throw new Error("Oturum gerekli.");
  }

  const { data: rows, error: listErr } = await supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", context.restaurant.id);

  if (listErr) {
    throw new Error(`Kategoriler okunamadı: ${mapDbError(listErr.message)}`);
  }

  const allowed = new Set((rows ?? []).map((r) => r.id));
  if (orderedIds.length !== allowed.size) {
    throw new Error("Geçersiz sıralama: kategori sayısı uyuşmuyor.");
  }
  for (const id of orderedIds) {
    if (!allowed.has(id)) {
      throw new Error("Geçersiz sıralama: bilinmeyen kategori.");
    }
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("categories")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("restaurant_id", context.restaurant.id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`Sıralama kaydedilemedi: ${mapDbError(failed.error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function deleteCategory(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== context.userId) {
    throw new Error("Oturum gerekli.");
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    throw new Error("Category id is required.");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  if (fetchErr || !row) {
    throw new Error("Kategori bulunamadı veya yetkiniz yok.");
  }

  const { error: prodErr } = await supabase
    .from("products")
    .delete()
    .eq("category_id", categoryId)
    .eq("restaurant_id", context.restaurant.id);

  if (prodErr) {
    const msg = prodErr.message.includes("foreign key") || prodErr.message.includes("violates")
      ? "Bu kategorideki bazı ürünler sipariş geçmişine bağlı; önce ürünleri tek tek silmeyi deneyin veya destek alın."
      : mapDbError(prodErr.message);
    throw new Error(`Ürünler silinemedi: ${msg}`);
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    throw new Error(`Kategori silinemedi: ${mapDbError(error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
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
    throw new Error(`Failed to toggle category: ${mapDbError(error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}
