"use server";

import {
  updateTenantBusinessSettings,
  type TenantSettingsPatch,
  type UpdateTenantSettingsResult,
} from "@/lib/dashboard/tenant-settings";

export type { TenantSettingsPatch, UpdateTenantSettingsResult };

/** @deprecated Panelde `/api/dashboard/tenant` POST kullanın (RSC yenilemesi yok). */
export async function updateTenantBusinessSettingsAction(
  patch: TenantSettingsPatch,
): Promise<UpdateTenantSettingsResult> {
  return updateTenantBusinessSettings(patch);
}
