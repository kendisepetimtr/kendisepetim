import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { FavoriteKind, GuestFavorite } from "@/lib/guest-favorites";

export type CustomerFavorite = {
  id: string;
  kind: FavoriteKind;
  subdomain: string;
  productId: string | null;
  productName: string;
  restaurantName: string;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): CustomerFavorite {
  return {
    id: String(row.id ?? ""),
    kind: row.kind === "product" ? "product" : "restaurant",
    subdomain: String(row.subdomain ?? "").toLowerCase(),
    productId: typeof row.product_id === "string" ? row.product_id : null,
    productName: typeof row.product_name === "string" ? row.product_name : "",
    restaurantName: typeof row.restaurant_name === "string" ? row.restaurant_name : "",
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function loadCustomerFavorites(userId: string): Promise<CustomerFavorite[]> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_favorites")
      .select("id, kind, subdomain, product_id, product_name, restaurant_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => mapRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function upsertCustomerFavorite(input: {
  userId: string;
  kind: FavoriteKind;
  subdomain: string;
  productId?: string;
  productName?: string;
  restaurantName: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const subdomain = input.subdomain.toLowerCase();
    if (input.kind === "restaurant") {
      const { data: existing } = await svc
        .from("customer_favorites")
        .select("id")
        .eq("user_id", input.userId)
        .eq("kind", "restaurant")
        .eq("subdomain", subdomain)
        .maybeSingle();
      if (existing?.id) return { ok: true, id: existing.id as string };
      const { data, error } = await svc
        .from("customer_favorites")
        .insert({
          user_id: input.userId,
          kind: "restaurant",
          subdomain,
          product_id: null,
          restaurant_name: input.restaurantName,
        })
        .select("id")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "Favori eklenemedi." };
      return { ok: true, id: data.id as string };
    }

    const productId = input.productId?.trim();
    if (!productId) return { ok: false, error: "Ürün gerekli." };
    const { data: existing } = await svc
      .from("customer_favorites")
      .select("id")
      .eq("user_id", input.userId)
      .eq("kind", "product")
      .eq("subdomain", subdomain)
      .eq("product_id", productId)
      .maybeSingle();
    if (existing?.id) return { ok: true, id: existing.id as string };
    const { data, error } = await svc
      .from("customer_favorites")
      .insert({
        user_id: input.userId,
        kind: "product",
        subdomain,
        product_id: productId,
        product_name: input.productName ?? "",
        restaurant_name: input.restaurantName,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Favori eklenemedi." };
    return { ok: true, id: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Favori eklenemedi." };
  }
}

export async function deleteCustomerFavorite(input: {
  userId: string;
  kind: FavoriteKind;
  subdomain: string;
  productId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const subdomain = input.subdomain.toLowerCase();
    let q = svc
      .from("customer_favorites")
      .delete()
      .eq("user_id", input.userId)
      .eq("kind", input.kind)
      .eq("subdomain", subdomain);
    if (input.kind === "product") {
      q = q.eq("product_id", input.productId ?? "");
    } else {
      q = q.is("product_id", null);
    }
    const { error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Favori silinemedi." };
  }
}

export async function migrateGuestFavoritesToAccount(
  userId: string,
  items: GuestFavorite[],
): Promise<void> {
  for (const item of items) {
    await upsertCustomerFavorite({
      userId,
      kind: item.kind,
      subdomain: item.subdomain,
      productId: item.productId,
      productName: item.productName,
      restaurantName: item.restaurantName,
    });
  }
}
