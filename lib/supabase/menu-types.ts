import type { MenuProductCustomWarning } from "@/lib/menu-product-warnings";
import type { VariationGroup } from "@/lib/menu-variations";

/**
 * Menü katalog tabloları — supabase/migrations ile uyumlu.
 * Şema değişince migration ve bu tipler birlikte güncellenmeli.
 */
export type MenuCategoryRow = {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  hidden: boolean;
  sort_order: number;
};

export type MenuCategoryInsert = Omit<MenuCategoryRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MenuCategoryUpdate = Partial<Omit<MenuCategoryRow, 'id' | 'created_at' | 'updated_at'>>;

export type MenuProductRow = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  use_package_price: boolean;
  package_price: number;
  hidden: boolean;
  signature_dish: boolean;
  checkout_upsell: boolean;
  image_url: string | null;
  warning_preset_keys: string[];
  custom_warning_tags: MenuProductCustomWarning[];
  variation_groups: VariationGroup[];
  sort_order: number;
};

export type MenuProductInsert = Omit<MenuProductRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MenuProductUpdate = Partial<Omit<MenuProductRow, 'id' | 'created_at' | 'updated_at'>>;
