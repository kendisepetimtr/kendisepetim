"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidStaffPin, verifyStaffPin } from "@/lib/staff/pin";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import {
  cashierSessionCookieOptions,
  CASHIER_SESSION_COOKIE,
  mintStaffSessionToken,
} from "@/lib/staff/session";

export type CashierPinActionState = { error?: string } | null;

function normalizeKasaNextPath(nextRaw: string): string {
  if (nextRaw.startsWith("/kasa")) return nextRaw;
  return "/kasa";
}

export async function verifyCashierPinAction(
  _prev: CashierPinActionState,
  formData: FormData,
): Promise<CashierPinActionState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const next = normalizeKasaNextPath(String(formData.get("next") ?? "/kasa"));

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
  if (!tenant.cashier_pin_hash || !tenant.cashier_pin_set_at) {
    return { error: "Kasa PIN henüz tanımlanmadı. Dashboard → Ayarlar → Operasyon." };
  }
  if (!verifyStaffPin(pin, tenant.cashier_pin_hash)) {
    return { error: "PIN hatalı." };
  }

  const token = mintStaffSessionToken({
    tenantId: tenant.id,
    role: "cashier",
    pinSetAt: tenant.cashier_pin_set_at,
  });
  if (!token) {
    return { error: "STAFF_SESSION_SECRET (veya OWNER_ADMIN_SESSION_SECRET) eksik veya çok kısa." };
  }

  const jar = await cookies();
  jar.set(CASHIER_SESSION_COOKIE, token, cashierSessionCookieOptions());
  redirect(next);
}

export async function signOutCashierAction(): Promise<void> {
  const jar = await cookies();
  jar.set(CASHIER_SESSION_COOKIE, "", { ...cashierSessionCookieOptions(), maxAge: 0 });
  redirect("/kasa/pin");
}
