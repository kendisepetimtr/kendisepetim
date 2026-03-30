"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "../../lib/supabase";
import { buildProductImagesPublicUrl } from "../../lib/supabase/storage-public-url";
import { getCurrentRestaurantContext } from "../tenants";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

function toOptionalPrice(value: FormDataEntryValue | null): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Paket/online fiyatı geçerli bir sayı olmalıdır.");
  }
  return Number(parsed.toFixed(2));
}

function parseIngredientsLines(value: FormDataEntryValue | null): string[] {
  const text = String(value ?? "");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isImageFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    (value as File).size > 0
  );
}

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function extForImageMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

function menuRevalidatePaths(restaurantSlug: string) {
  revalidatePath("/dashboard/menu-management");
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  revalidatePath(`/t/${restaurantSlug}`);
}

function isUnknownProductColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes("could not find") && m.includes("column")) ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

const PHASE1_DB_HINT =
  "Veritabanında Faz 1 kolonları yok. Supabase SQL Editor'de supabase/patches/products-phase1-ingredients-delivery-image.sql dosyasını çalıştırın; içindekiler ve paket/online fiyatı ancak o zaman kaydedilir.";

function mapDbError(message: string): string {
  if (message.includes("row-level security") || message.includes("RLS")) {
    return (
      `${message} — Supabase tarafinda authenticated rol icin products INSERT/UPDATE politikasi gerekir. ` +
      "Projedeki supabase/patches/fix-categories-products-rls-split-policies.sql dosyasini SQL Editorde calistirin; " +
      "restaurant_members tablosunda bu restoran ve auth.uid() icin aktif uyelik satiri oldugundan emin olun."
    );
  }
  if (message.includes("products_delivery_price_when_flag_chk")) {
    return "Paket/online fiyatı işaretliyken ikinci fiyat zorunludur ve negatif olamaz.";
  }
  return message;
}

async function assertSessionMatchesContext(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  contextUserId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Oturum bulunamadi. Cikis yapip tekrar giris yapin.");
  }
  if (user.id !== contextUserId) {
    throw new Error("Oturum ve restoran baglami uyusmuyor. Sayfayi yenileyin.");
  }
}

async function uploadProductCover(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  restaurantId: string,
  productId: string,
  file: File,
): Promise<{ publicUrl: string; storagePath: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Görsel en fazla 5 MB olabilir.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Görsel dosyası boş veya okunamadı.");
  }
  const mime =
    file.type && IMAGE_TYPES.has(file.type) ? file.type : sniffImageMime(buffer);
  if (!mime || !IMAGE_TYPES.has(mime)) {
    throw new Error("Görsel yalnızca JPEG, PNG, WebP veya GIF olabilir.");
  }
  const ext = extForImageMime(mime);
  const storagePath = `${restaurantId}/${productId}/cover.${ext}`;
  const { error: upErr } = await supabase.storage.from("product-images").upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
    cacheControl: "31536000",
  });
  if (upErr) {
    throw new Error(
      `Görsel yüklenemedi: ${upErr.message}. Storage bucket ve politikaları için supabase/patches/storage-product-images.sql dosyasına bakın. Bucket'ın Dashboard'dan public olduğundan emin olun.`,
    );
  }
  return { publicUrl: buildProductImagesPublicUrl(storagePath), storagePath };
}

async function removeStorageObject(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storagePath: string | null,
) {
  if (!storagePath) return;
  const { error } = await supabase.storage.from("product-images").remove([storagePath]);
  if (error) {
    console.error("Storage silinemedi:", error.message);
  }
}

export async function createProduct(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  await assertSessionMatchesContext(supabase, context.userId);
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const price = toPrice(formData.get("price"));
  const useDeliveryPrice = formData.get("use_delivery_price") === "true";
  const deliveryPrice = useDeliveryPrice ? toOptionalPrice(formData.get("delivery_price")) : null;
  const ingredients = parseIngredientsLines(formData.get("ingredients"));
  const imageFile = formData.get("image");

  if (!name || !categoryId) {
    throw new Error("Product name and category are required.");
  }
  if (useDeliveryPrice && deliveryPrice === null) {
    throw new Error("Paket/online fiyatı işaretliyken ikinci fiyatı girin.");
  }

  const { data: minRow } = await supabase
    .from("products")
    .select("sort_order")
    .eq("restaurant_id", context.restaurant.id)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const sortOrder = minRow !== null ? minRow.sort_order - 1 : 0;

  const legacyInsert = {
    restaurant_id: context.restaurant.id,
    category_id: categoryId,
    name,
    description,
    image_url: null as string | null,
    price,
    sort_order: sortOrder,
    is_active: true,
  };

  const phase1Insert = {
    ...legacyInsert,
    image_storage_path: null as string | null,
    delivery_price: useDeliveryPrice ? deliveryPrice : null,
    use_delivery_price: useDeliveryPrice,
    ingredients,
  };

  const firstInsert = await supabase.from("products").insert(phase1Insert).select("id").single();
  let inserted = firstInsert.data as { id: string } | null;
  let insertErr = firstInsert.error;

  if (insertErr && isUnknownProductColumnError(insertErr.message)) {
    if (useDeliveryPrice || ingredients.length > 0) {
      throw new Error(PHASE1_DB_HINT);
    }
    const secondInsert = await supabase.from("products").insert(legacyInsert).select("id").single();
    inserted = secondInsert.data as { id: string } | null;
    insertErr = secondInsert.error;
  }

  if (insertErr || !inserted) {
    throw new Error(`Failed to create product: ${mapDbError(insertErr?.message ?? "unknown")}`);
  }

  const productId = inserted.id;

  if (isImageFile(imageFile)) {
    try {
      const { publicUrl, storagePath } = await uploadProductCover(
        supabase,
        context.restaurant.id,
        productId,
        imageFile,
      );
      let updErr = (
        await supabase
          .from("products")
          .update({ image_url: publicUrl, image_storage_path: storagePath })
          .eq("id", productId)
          .eq("restaurant_id", context.restaurant.id)
      ).error;
      if (updErr && isUnknownProductColumnError(updErr.message)) {
        updErr = (
          await supabase
            .from("products")
            .update({ image_url: publicUrl })
            .eq("id", productId)
            .eq("restaurant_id", context.restaurant.id)
        ).error;
      }
      if (updErr) {
        await removeStorageObject(supabase, storagePath);
        await supabase.from("products").delete().eq("id", productId).eq("restaurant_id", context.restaurant.id);
        throw new Error(`Ürün görseli kaydedilemedi: ${mapDbError(updErr.message)}`);
      }
    } catch (e) {
      await supabase.from("products").delete().eq("id", productId).eq("restaurant_id", context.restaurant.id);
      throw e instanceof Error ? e : new Error("Ürün oluşturulamadı.");
    }
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function updateProduct(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  await assertSessionMatchesContext(supabase, context.userId);
  const productId = String(formData.get("product_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = toOptionalText(formData.get("description"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const price = toPrice(formData.get("price"));
  const sortOrder = toSortOrder(formData.get("sort_order"));
  const useDeliveryPrice = formData.get("use_delivery_price") === "true";
  const deliveryPrice = useDeliveryPrice ? toOptionalPrice(formData.get("delivery_price")) : null;
  const ingredients = parseIngredientsLines(formData.get("ingredients"));
  const removeImage = formData.get("remove_image") === "true";
  const imageFile = formData.get("image");

  if (!productId || !name || !categoryId) {
    throw new Error("Product id, name and category are required.");
  }
  if (useDeliveryPrice && deliveryPrice === null) {
    throw new Error("Paket/online fiyatı işaretliyken ikinci fiyatı girin.");
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error(`Ürün bulunamadı: ${mapDbError(fetchErr?.message ?? "unknown")}`);
  }

  const prevPath =
    (existing as { image_storage_path?: string | null }).image_storage_path ?? null;

  const patch: Record<string, unknown> = {
    category_id: categoryId,
    name,
    description,
    price,
    delivery_price: useDeliveryPrice ? deliveryPrice : null,
    use_delivery_price: useDeliveryPrice,
    ingredients,
    sort_order: sortOrder,
  };

  if (isImageFile(imageFile)) {
    await removeStorageObject(supabase, prevPath);
    const { publicUrl, storagePath } = await uploadProductCover(
      supabase,
      context.restaurant.id,
      productId,
      imageFile,
    );
    patch.image_url = publicUrl;
    patch.image_storage_path = storagePath;
  } else if (removeImage) {
    await removeStorageObject(supabase, prevPath);
    patch.image_url = null;
    patch.image_storage_path = null;
  }

  let { error: updateError } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id);

  if (updateError && isUnknownProductColumnError(updateError.message)) {
    if (useDeliveryPrice || ingredients.length > 0) {
      throw new Error(PHASE1_DB_HINT);
    }
    const legacyPatch: Record<string, unknown> = {
      category_id: categoryId,
      name,
      description,
      price,
      sort_order: sortOrder,
    };
    if ("image_url" in patch) {
      legacyPatch.image_url = patch.image_url;
    }
    const retry = await supabase
      .from("products")
      .update(legacyPatch)
      .eq("id", productId)
      .eq("restaurant_id", context.restaurant.id);
    updateError = retry.error;
  }

  if (updateError) {
    throw new Error(`Failed to update product: ${mapDbError(updateError.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function reorderProductsInCategory(categoryId: string, orderedProductIds: string[]) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  await assertSessionMatchesContext(supabase, context.userId);

  const { data: rows, error: listErr } = await supabase
    .from("products")
    .select("id")
    .eq("restaurant_id", context.restaurant.id)
    .eq("category_id", categoryId);

  if (listErr) {
    throw new Error(`Ürünler okunamadı: ${mapDbError(listErr.message)}`);
  }

  const allowed = new Set((rows ?? []).map((r) => r.id));
  if (orderedProductIds.length !== allowed.size) {
    throw new Error("Geçersiz sıralama: ürün sayısı uyuşmuyor.");
  }
  for (const id of orderedProductIds) {
    if (!allowed.has(id)) {
      throw new Error("Geçersiz sıralama: bilinmeyen ürün.");
    }
  }

  const updates = orderedProductIds.map((id, index) =>
    supabase
      .from("products")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("restaurant_id", context.restaurant.id)
      .eq("category_id", categoryId),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(`Ürün sırası kaydedilemedi: ${mapDbError(failed.error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function deleteProduct(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  await assertSessionMatchesContext(supabase, context.userId);
  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    throw new Error("Product id is required.");
  }

  const { data: row } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id)
    .maybeSingle();

  const storagePath =
    (row as { image_storage_path?: string | null } | null)?.image_storage_path ?? null;
  await removeStorageObject(supabase, storagePath);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("restaurant_id", context.restaurant.id);

  if (error) {
    const hint =
      error.message.includes("foreign key") || error.message.includes("violates")
        ? " Bu ürün sipariş kayıtlarında kullanılıyor olabilir."
        : "";
    throw new Error(`Ürün silinemedi: ${mapDbError(error.message)}${hint}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}

export async function toggleProductActive(formData: FormData) {
  const context = await getCurrentRestaurantContext();
  if (!context) throw new Error("Unauthorized");

  const supabase = await createServerSupabaseClient();
  await assertSessionMatchesContext(supabase, context.userId);
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
    throw new Error(`Failed to toggle product: ${mapDbError(error.message)}`);
  }

  menuRevalidatePaths(context.restaurant.slug);
}
