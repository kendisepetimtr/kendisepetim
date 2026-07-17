"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidStaffPin, verifyStaffPin } from "@/lib/staff/pin";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import {
  countActiveWaiters,
  findWaiterByPin,
} from "@/lib/garson/waiter-tenant";
import { waiterDisplayName } from "@/lib/supabase/waiter-types";
import {
  mintStaffSessionToken,
  waiterSessionCookieOptions,
  WAITER_SESSION_COOKIE,
  WAITER_SESSION_MAX_AGE_MULTI_SEC,
  WAITER_SESSION_MAX_AGE_SINGLE_SEC,
  legacyStaffCookieClearOptions,
} from "@/lib/staff/session";

export type WaiterPinActionState = { error?: string } | null;

function normalizeGarsonNextPath(nextRaw: string): string {
  if (nextRaw.startsWith("/garson")) return nextRaw;
  return "/garson";
}

export async function verifyWaiterPinAction(
  _prev: WaiterPinActionState,
  formData: FormData,
): Promise<WaiterPinActionState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const next = normalizeGarsonNextPath(String(formData.get("next") ?? "/garson"));

  if (!slug) {
    return { error: "Geçersiz işletme." };
  }
  if (!isValidStaffPin(pin)) {
    return { error: "PIN tam olarak 4 haneli olmalıdır." };
  }

  const tenant = await getTenantBySubdomain(slug);
  if (!tenant) {
    return { error: "İşletme bulunamadı." };
  }
  if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {
    return { error: "Masa servisi bu işletmede aktif değil." };
  }

  const waiter = await findWaiterByPin(tenant.id, pin, verifyStaffPin);
  if (!waiter) {
    const activeCount = await countActiveWaiters(tenant.id);
    if (activeCount === 0) {
      return {
        error: "Henüz garson tanımlanmadı. Dashboard → Ayarlar → Operasyon → Garsonlar.",
      };
    }
    return { error: "PIN hatalı." };
  }

  const activeCount = await countActiveWaiters(tenant.id);
  const maxAgeSec =
    activeCount > 1 ? WAITER_SESSION_MAX_AGE_MULTI_SEC : WAITER_SESSION_MAX_AGE_SINGLE_SEC;

  const token = mintStaffSessionToken({
    tenantId: tenant.id,
    role: "waiter",
    pinSetAt: waiter.pin_set_at,
    maxAgeSec,
    waiterId: waiter.id,
    staffLabel: waiterDisplayName(waiter),
  });
  if (!token) {
    return { error: "STAFF_SESSION_SECRET (veya OWNER_ADMIN_SESSION_SECRET) eksik veya çok kısa." };
  }

  const jar = await cookies();
  jar.set(WAITER_SESSION_COOKIE, "", legacyStaffCookieClearOptions("/garson"));
  jar.set(WAITER_SESSION_COOKIE, token, waiterSessionCookieOptions(maxAgeSec));
  redirect(next);
}

export async function signOutWaiterAction(): Promise<void> {
  const jar = await cookies();
  jar.set(WAITER_SESSION_COOKIE, "", { ...waiterSessionCookieOptions(), maxAge: 0 });
  jar.set(WAITER_SESSION_COOKIE, "", legacyStaffCookieClearOptions("/garson"));
  redirect("/garson/pin");
}
