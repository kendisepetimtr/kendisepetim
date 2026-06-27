"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidStaffPin, verifyStaffPin } from "@/lib/staff/pin";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import {
  mintStaffSessionToken,
  waiterSessionCookieOptions,
  WAITER_SESSION_COOKIE,
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
  if (!tenant.waiter_pin_hash || !tenant.waiter_pin_set_at) {
    return { error: "Garson PIN henüz tanımlanmadı. Dashboard → Ayarlar → Operasyon." };
  }
  if (!verifyStaffPin(pin, tenant.waiter_pin_hash)) {
    return { error: "PIN hatalı." };
  }

  const token = mintStaffSessionToken({
    tenantId: tenant.id,
    role: "waiter",
    pinSetAt: tenant.waiter_pin_set_at,
  });
  if (!token) {
    return { error: "STAFF_SESSION_SECRET (veya OWNER_ADMIN_SESSION_SECRET) eksik veya çok kısa." };
  }

  const jar = await cookies();
  jar.set(WAITER_SESSION_COOKIE, token, waiterSessionCookieOptions());
  redirect(next);
}

export async function signOutWaiterAction(): Promise<void> {
  const jar = await cookies();
  jar.set(WAITER_SESSION_COOKIE, "", { ...waiterSessionCookieOptions(), maxAge: 0 });
  redirect("/garson/pin");
}
