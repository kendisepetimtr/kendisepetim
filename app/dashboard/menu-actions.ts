"use server";

import type { CategoryEditFields } from "@/components/dashboard/category-edit-modal";
import type { ProductFormFields } from "@/components/dashboard/product-form-modal";
import {
  getDashboardMenuProductCount,
  loadDashboardMenuState,
  type MenuLoadResult,
} from "@/lib/dashboard/menu-load";
import { runDashboardMenuMutation } from "@/lib/dashboard/menu-mutations";

export type { MenuLoadResult };

/** @deprecated Panelde `/api/dashboard/menu` kullanın (RSC yenilemesi yok). */
export async function loadDashboardMenuAction(): Promise<MenuLoadResult> {
  return loadDashboardMenuState();
}

/** @deprecated Panelde `/api/dashboard/menu/count` kullanın. */
export async function getDashboardMenuProductCountAction(): Promise<number> {
  return getDashboardMenuProductCount();
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function createMenuCategoryAction(nameRaw: string): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "createCategory", name: nameRaw });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function updateMenuCategoryAction(id: string, fields: CategoryEditFields): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "updateCategory", id, fields });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function deleteMenuCategoryAction(id: string): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "deleteCategory", id });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function toggleMenuCategoryHiddenAction(id: string, hideProducts: boolean): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "toggleCategoryHidden", id, hideProducts });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function upsertMenuProductAction(fields: ProductFormFields, productId?: string): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "upsertProduct", fields, productId });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function toggleMenuProductHiddenAction(id: string): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "toggleProductHidden", id });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function deleteMenuProductAction(id: string): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "deleteProduct", id });
}

/** @deprecated Panelde `/api/dashboard/menu` POST kullanın. */
export async function clearAllMenuDataAction(): Promise<MenuLoadResult> {
  return runDashboardMenuMutation({ action: "clearAll" });
}
