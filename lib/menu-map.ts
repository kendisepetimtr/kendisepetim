import type { LocalMenuCategory, LocalMenuProduct, LocalMenuState } from '@/lib/local-menu';
import {
  buildMenuProductWarningBadges,
  sanitizeCustomMenuWarnings,
  sanitizeMenuWarningPresetKeys,
} from '@/lib/menu-product-warnings';
import { sanitizeVariationGroups } from '@/lib/menu-variations';
import type { MenuCategoryRow, MenuProductRow } from '@/lib/supabase/menu-types';

export function menuCategoryRowToLocal(row: MenuCategoryRow): LocalMenuCategory {
  return {
    id: row.id,
    name: row.name,
    hidden: row.hidden,
    sortOrder: row.sort_order,
    description: row.description,
  };
}

export function menuProductRowToLocal(row: MenuProductRow): LocalMenuProduct {
  const warningPresetKeys = sanitizeMenuWarningPresetKeys(row.warning_preset_keys);
  const customWarnings = sanitizeCustomMenuWarnings(row.custom_warning_tags);
  return {
    id: row.id,
    categoryId: row.category_id ?? '',
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    price: Number(row.price),
    usePackagePrice: row.use_package_price,
    packagePrice: Number(row.package_price),
    hidden: row.hidden,
    signatureDish: row.signature_dish,
    checkoutUpsell: row.checkout_upsell,
    imageDataUrl: row.image_url?.trim() ?? '',
    warningPresetKeys,
    customWarnings,
    warningBadges: buildMenuProductWarningBadges(warningPresetKeys, customWarnings),
    variationGroups: sanitizeVariationGroups(row.variation_groups),
  };
}

export function buildLocalMenuState(rows: {
  categories: MenuCategoryRow[];
  products: MenuProductRow[];
}): LocalMenuState {
  return {
    categories: rows.categories.map(menuCategoryRowToLocal),
    products: rows.products.map(menuProductRowToLocal),
  };
}
