"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import { getCurrentRestaurantContext } from "../../../../features/tenants";
import {
  candidateSlugFromBase,
  needsSlugFallback,
  restaurantNameToBaseSlug,
} from "../../../../lib/tenant/restaurant-slug";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../lib/tenant/slug";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kendisepetim.com";

export type SlugPreviewResult = {
  baseFromName: string;
  recommendedSlug: string;
  baseAvailable: boolean;
  alternateSlugs: string[];
  rootDomain: string;
  error?: string;
};

async function isSlugTaken(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, slug: string) {
  const { data } = await supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  return Boolean(data);
}

/**
 * Ad yazilirken: taban slug + ilk musait adres + yedek oneriler.
 */
export async function previewRestaurantSlug(restaurantName: string): Promise<SlugPreviewResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      baseFromName: "",
      recommendedSlug: "",
      baseAvailable: false,
      alternateSlugs: [],
      rootDomain: ROOT_DOMAIN,
      error: "Oturum gerekli.",
    };
  }

  const rawBase = restaurantNameToBaseSlug(restaurantName);
  const baseFromName = needsSlugFallback(rawBase) ? "restoran" : rawBase;

  const collected: string[] = [];
  for (let n = 0; n < 120 && collected.length < 5; n++) {
    const candidate = candidateSlugFromBase(baseFromName, n);
    if (!isValidTenantSlug(candidate)) continue;
    const taken = await isSlugTaken(supabase, candidate);
    if (!taken) {
      collected.push(candidate);
    }
  }

  if (collected.length === 0) {
    return {
      baseFromName,
      recommendedSlug: "",
      baseAvailable: false,
      alternateSlugs: [],
      rootDomain: ROOT_DOMAIN,
      error: "Uygun slug bulunamadi. Lutfen farkli bir ad deneyin.",
    };
  }

  const recommendedSlug = collected[0]!;
  const baseAvailable = recommendedSlug === baseFromName;

  return {
    baseFromName,
    recommendedSlug,
    baseAvailable,
    // Cakisma yoksa yedek listeyi gosterme; varsa diger musait adresler
    alternateSlugs: baseAvailable ? [] : collected.slice(1),
    rootDomain: ROOT_DOMAIN,
  };
}

export async function completeRestaurantOnboarding(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Oturum acin."));
  }

  const existing = await getCurrentRestaurantContext();
  if (existing) {
    redirect("/dashboard");
  }

  const restaurantName = String(formData.get("restaurant_name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = normalizeTenantSlug(slugRaw);

  if (!restaurantName) {
    redirect("/onboarding/restaurant?error=" + encodeURIComponent("Restoran adi zorunludur."));
  }
  if (!slug || !isValidTenantSlug(slug)) {
    redirect("/onboarding/restaurant?error=" + encodeURIComponent("Gecersiz adres (slug)."));
  }

  if (await isSlugTaken(supabase, slug)) {
    redirect(
      "/onboarding/restaurant?error=" +
        encodeURIComponent("Bu adres baska bir restoran tarafindan kullaniliyor. Baska bir slug secin."),
    );
  }

  const { data: restaurant, error: insertRestaurantError } = await supabase
    .from("restaurants")
    .insert({
      name: restaurantName,
      slug,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertRestaurantError || !restaurant) {
    redirect(
      "/onboarding/restaurant?error=" +
        encodeURIComponent(
          insertRestaurantError?.message ??
            "Restoran olusturulamadi. Supabase RLS veya baglanti ayarlarini kontrol edin.",
        ),
    );
  }

  const { error: memberError } = await supabase.from("restaurant_members").insert({
    restaurant_id: restaurant.id,
    user_id: user.id,
    role: "owner",
    is_active: true,
  });

  if (memberError) {
    await supabase.from("restaurants").delete().eq("id", restaurant.id);
    redirect(
      "/onboarding/restaurant?error=" +
        encodeURIComponent(
          memberError.message ?? "Uyelik kaydi olusturulamadi. RLS politikalari kontrol edin.",
        ),
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
