"use server";

import { loadDashboardTenantProfile, type DashboardTenantSyncResult } from "@/lib/dashboard/tenant-sync";

export type SyncDashboardTenantResult = DashboardTenantSyncResult;

/** @deprecated Panel açılışında `/api/dashboard/tenant` kullanın (RSC yenilemesi yok). */
export async function syncDashboardTenantAction(): Promise<SyncDashboardTenantResult> {
  return loadDashboardTenantProfile();
}
