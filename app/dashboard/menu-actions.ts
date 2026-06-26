'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, tryCreateServerSupabaseClient } from '@/lib/supabase/server';
import {
  getDashboardMenuProductCount,
  loadDashboardMenuState,
  type MenuLoadResult,
} from '@/lib/dashboard/menu-load';
import type { MenuCategoryRow, MenuProductRow } from '@/lib/supabase/menu-types';
import type { LocalMenuState } from '@/lib/local-menu';
import type { CategoryEditFields } from '@/components/dashboard/category-edit-modal';
import type { ProductFormFields } from '@/components/dashboard/product-form-modal';
import { buildLocalMenuState } from '@/lib/menu-map';
import { sanitizeCustomMenuWarnings, sanitizeMenuWarningPresetKeys } from '@/lib/menu-product-warnings';

export type { MenuLoadResult };

const MAX_PRODUCT_DESCRIPTION_LENGTH = 280;

async function getOwnerTenantId() {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) {
      return {
        supabase: null,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: 'Supabase bağlantısı kurulamadı.',
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        supabase,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: 'Oturum bulunamadı.',
      };
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (error || !tenant) {
      return {
        supabase,
        tenantId: null as string | null,
        subdomain: null as string | null,
        error: 'İşletme kaydı bulunamadı.',
      };
    }

    return {
      supabase,
      tenantId: tenant.id as string,
      subdomain: typeof tenant.subdomain === 'string' ? tenant.subdomain : null,
      error: null as string | null,
    };
  } catch {
    return {
      supabase: null,
      tenantId: null as string | null,
      subdomain: null as string | null,
      error: 'Sunucu hatası.',
    };
  }
}

function revalidateOwnerPublicMenu(subdomain: string | null) {
  if (subdomain) {
    revalidatePath(`/m/${subdomain}`);
  }
}

async function readMenuState(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, tenantId: string): Promise<LocalMenuState> {
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('menu_products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  return buildLocalMenuState({
    categories: (categories ?? []) as MenuCategoryRow[],
    products: (products ?? []) as MenuProductRow[],
  });
}

export async function loadDashboardMenuAction(): Promise<MenuLoadResult> {
  return loadDashboardMenuState();
}

export async function getDashboardMenuProductCountAction(): Promise<number> {
  return getDashboardMenuProductCount();
}

export async function createMenuCategoryAction(nameRaw: string): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const name = nameRaw.trim();
  if (!name) return { ok: false, error: 'Kategori adı zorunludur.' };

  const { data: current } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = typeof current?.[0]?.sort_order === 'number' ? current[0].sort_order + 1 : 0;

  const { error: insertError } = await supabase.from('menu_categories').insert({
    tenant_id: tenantId,
    name,
    description: '',
    hidden: false,
    sort_order: nextOrder,
  });
  if (insertError) return { ok: false, error: insertError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function updateMenuCategoryAction(id: string, fields: CategoryEditFields): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const name = fields.name.trim();
  if (!name) return { ok: false, error: 'Kategori adı zorunludur.' };
  const { error: updateError } = await supabase
    .from('menu_categories')
    .update({ name, description: fields.description.trim(), sort_order: fields.sortOrder })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (updateError) return { ok: false, error: updateError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function deleteMenuCategoryAction(id: string): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const { error: deleteError } = await supabase.from('menu_categories').delete().eq('id', id).eq('tenant_id', tenantId);
  if (deleteError) return { ok: false, error: deleteError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function toggleMenuCategoryHiddenAction(id: string, hideProducts: boolean): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };

  const { data: cat, error: findError } = await supabase
    .from('menu_categories')
    .select('hidden')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (findError || !cat) return { ok: false, error: findError?.message ?? 'Kategori bulunamadı.' };

  const nextHidden = !cat.hidden;
  const { error: updateError } = await supabase
    .from('menu_categories')
    .update({ hidden: nextHidden })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (updateError) return { ok: false, error: updateError.message };

  if (nextHidden && hideProducts) {
    const { error: productError } = await supabase
      .from('menu_products')
      .update({ hidden: true, signature_dish: false, checkout_upsell: false })
      .eq('tenant_id', tenantId)
      .eq('category_id', id);
    if (productError) return { ok: false, error: productError.message };
  }

  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

async function clearOtherSignatureDishes(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tenantId: string,
  exceptId?: string,
) {
  let q = supabase.from('menu_products').update({ signature_dish: false }).eq('tenant_id', tenantId).eq('signature_dish', true);
  if (exceptId) q = q.neq('id', exceptId);
  await q;
}

export async function upsertMenuProductAction(fields: ProductFormFields, productId?: string): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };

  const name = fields.name.trim();
  if (!name) return { ok: false, error: 'Ürün adı zorunludur.' };
  const categoryId = fields.categoryId.trim() || null;
  const payload = {
    tenant_id: tenantId,
    category_id: categoryId,
    name,
    description: fields.description.trim().slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH),
    ingredients: fields.ingredients.trim(),
    price: fields.price,
    use_package_price: fields.usePackagePrice,
    package_price: fields.usePackagePrice ? fields.packagePrice : 0,
    hidden: fields.hidden,
    signature_dish: fields.signatureDish && !fields.hidden,
    checkout_upsell: fields.checkoutUpsell && !fields.hidden,
    image_url: fields.imageDataUrl.trim() || null,
    warning_preset_keys: sanitizeMenuWarningPresetKeys(fields.warningPresetKeys),
    custom_warning_tags: sanitizeCustomMenuWarnings(fields.customWarnings),
  };

  if (payload.signature_dish) {
    await clearOtherSignatureDishes(supabase, tenantId, productId);
  }

  if (productId) {
    const { error: updateError } = await supabase
      .from('menu_products')
      .update(payload)
      .eq('id', productId)
      .eq('tenant_id', tenantId);
    if (updateError) return { ok: false, error: updateError.message };
  } else {
    const { data: current } = await supabase
      .from('menu_products')
      .select('sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextSort = typeof current?.[0]?.sort_order === 'number' ? current[0].sort_order + 1 : 0;
    const { error: insertError } = await supabase.from('menu_products').insert({ ...payload, sort_order: nextSort });
    if (insertError) return { ok: false, error: insertError.message };
  }

  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function toggleMenuProductHiddenAction(id: string): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const { data: row, error: findError } = await supabase
    .from('menu_products')
    .select('hidden')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (findError || !row) return { ok: false, error: findError?.message ?? 'Ürün bulunamadı.' };
  const nextHidden = !row.hidden;
  const { error: updateError } = await supabase
    .from('menu_products')
    .update({
      hidden: nextHidden,
      ...(nextHidden ? { signature_dish: false, checkout_upsell: false } : {}),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (updateError) return { ok: false, error: updateError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function deleteMenuProductAction(id: string): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const { error: deleteError } = await supabase.from('menu_products').delete().eq('id', id).eq('tenant_id', tenantId);
  if (deleteError) return { ok: false, error: deleteError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}

export async function clearAllMenuDataAction(): Promise<MenuLoadResult> {
  const { supabase, tenantId, subdomain, error } = await getOwnerTenantId();
  if (!supabase || !tenantId) return { ok: false, error: error ?? 'İşlem yapılamadı.' };
  const { error: productError } = await supabase.from('menu_products').delete().eq('tenant_id', tenantId);
  if (productError) return { ok: false, error: productError.message };
  const { error: categoryError } = await supabase.from('menu_categories').delete().eq('tenant_id', tenantId);
  if (categoryError) return { ok: false, error: categoryError.message };
  revalidateOwnerPublicMenu(subdomain);
  return { ok: true, state: await readMenuState(supabase, tenantId) };
}
