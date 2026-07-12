import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import { buildLocalMenuState } from "@/lib/menu-map";
import type { LocalMenuState } from "@/lib/local-menu";

export async function loadVisibleMenuForTenant(tenantId: string): Promise<LocalMenuState> {
  const svc = createServiceSupabaseClient();

  const { data: categoryRows } = await svc
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("hidden", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (categoryRows ?? []) as MenuCategoryRow[];
  const categoryIds = categories.map((c) => c.id);

  const { data: productRows } =
    categoryIds.length > 0
      ? await svc
          .from("menu_products")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("hidden", false)
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
      : { data: [] as MenuProductRow[] };

  return buildLocalMenuState({
    categories,
    products: (productRows ?? []) as MenuProductRow[],
  });
}
