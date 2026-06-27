"use server";

import { signOutDashboardSession } from "@/lib/dashboard/sign-out";

/** @deprecated Panelde `/api/dashboard/sign-out` POST kullanın (RSC yenilemesi yok). */
export async function signOutFromDashboard(): Promise<void> {
  return signOutDashboardSession();
}
