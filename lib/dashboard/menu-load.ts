import { buildLocalMenuState } from "@/lib/menu-map";
import type { LocalMenuState } from "@/lib/local-menu";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import { createServerSupabaseClient, tryCreateServerSupabaseClient } from "@/lib/supabase/server";

export type MenuLoadResult =
  | { ok: true; state: LocalMenuState }
  | { ok: false; error: string };

async function getOwnerTenantId() {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) {
      return {
        supabase: null,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: "Supabase bağlantısı kurulamadı.",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        supabase,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: "Oturum bulunamadı.",
      };
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, subdomain")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error || !tenant) {
      return {
        supabase,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: "İşletme kaydı bulunamadı.",
      };
    }

    return {
      supabase,
      tenantId: tenant.id as string,
      subdomain: typeof tenant.subdomain === "string" ? tenant.subdomain : null,
      error: null as string | null,
    };
  } catch {
    return {
      supabase: null,
      tenantId: null as string | null,
      subdomain: null as string | null,
      error: "Sunucu hatası.",
    };
  }
}

async function readMenuState(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tenantId: string,
): Promise<LocalMenuState> {
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("menu_products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return buildLocalMenuState({
    categories: (categories ?? []) as MenuCategoryRow[],
    products: (products ?? []) as MenuProductRow[],
  });
}

export async function loadDashboardMenuState(): Promise<MenuLoadResult> {
  try {
    const { supabase, tenantId, error } = await getOwnerTenantId();
    if (!supabase || !tenantId) return { ok: false, error: error ?? "Menü yüklenemedi." };
    const state = await readMenuState(supabase, tenantId);
    return { ok: true, state };
  } catch {
    return { ok: false, error: "Menü yüklenemedi." };
  }
}

export async function getDashboardMenuProductCount(): Promise<number> {
  try {
    const { supabase, tenantId } = await getOwnerTenantId();
    if (!supabase || !tenantId) return 0;
    const { count } = await supabase
      .from("menu_products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    return count ?? 0;
  } catch {
    return 0;
  }
}
