import type { MenuProductCustomWarning, MenuProductWarningBadge } from "@/lib/menu-product-warnings";
import type { VariationGroup } from "@/lib/menu-variations";

export const MAX_IMAGE_DATA_URL_LENGTH = 4_800_000;

export type LocalMenuCategory = {
  id: string;
  name: string;
  hidden: boolean;
  sortOrder: number;
  description: string;
};

export type LocalMenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  usePackagePrice: boolean;
  packagePrice: number;
  hidden: boolean;
  signatureDish: boolean;
  checkoutUpsell: boolean;
  imageDataUrl: string;
  warningPresetKeys: string[];
  customWarnings: MenuProductCustomWarning[];
  warningBadges: MenuProductWarningBadge[];
  variationGroups: VariationGroup[];
};

export type LocalMenuState = {
  categories: LocalMenuCategory[];
  products: LocalMenuProduct[];
};

export function getDisplayedProductPrice(p: LocalMenuProduct): number {
  return p.usePackagePrice ? p.packagePrice : p.price;
}

export function parseIngredientLines(ingredients: string): string[] {
  return ingredients
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sortCategoriesForMenu(categories: LocalMenuCategory[]): LocalMenuCategory[] {
  return [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'tr');
  });
}

export function getOrphanProducts(state: LocalMenuState): LocalMenuProduct[] {
  const ids = new Set(state.categories.map((c) => c.id));
  return state.products.filter((p) => !ids.has(p.categoryId));
}

export function getProductsInCategory(state: LocalMenuState, categoryId: string): LocalMenuProduct[] {
  return state.products.filter((p) => p.categoryId === categoryId);
}
