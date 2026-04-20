"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { hashOwnerAdminPin, isValidOwnerAdminPin } from "@/lib/owner-admin/pin";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import {
  isReservedSubdomain,
  isValidSubdomainFormat,
} from "@/lib/superadmin/reserved-subdomains";
import { mintSuperadminToken, SUPERADMIN_COOKIE, superadminCookieOptions } from "@/lib/superadmin/session";
import type { TenantPlan } from "@/lib/supabase/tenant-types";

export type SuperadminLoginState = { error: string } | null;

function hashPw(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

function safeEqualPassword(input: string, expected: string): boolean {
  const a = hashPw(input);
  const b = hashPw(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function superadminLoginAction(
  _prev: SuperadminLoginState,
  formData: FormData,
): Promise<SuperadminLoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.SUPERADMIN_PASSWORD ?? "";

  if (!expected) {
    return { error: "Sunucuda SUPERADMIN_PASSWORD tanımlı değil." };
  }
  if (!password || !safeEqualPassword(password, expected)) {
    return { error: "Şifre hatalı." };
  }

  const token = mintSuperadminToken();
  if (!token) {
    return { error: "SUPERADMIN_SESSION_SECRET eksik veya çok kısa (en az 16 karakter)." };
  }
  const jar = await cookies();
  jar.set(SUPERADMIN_COOKIE, token, superadminCookieOptions());
  redirect("/superadmin");
}

export async function superadminLogoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SUPERADMIN_COOKIE);
  redirect("/superadmin/giris");
}

async function guardAndService() {
  await requireSuperadminOrRedirect();
  return createServiceSupabaseClient();
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function superadminUpdateSubdomain(tenantId: string, subdomainRaw: string): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const subdomain = subdomainRaw.trim().toLowerCase();
  if (!isValidSubdomainFormat(subdomain)) {
    return { error: "Alt alan adı biçimi geçersiz." };
  }
  if (isReservedSubdomain(subdomain)) {
    return { error: "Bu alt alan adı rezerve." };
  }

  const svc = await guardAndService();
  const { data: other } = await svc.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
  if (other && other.id !== tenantId) {
    return { error: "Bu alt alan adı başka işletmede kullanılıyor." };
  }

  const { error } = await svc.from("tenants").update({ subdomain }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  return {};
}

export async function superadminSetPlan(tenantId: string, plan: TenantPlan): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  if (plan !== "free" && plan !== "premium") return { error: "Geçersiz plan." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ plan }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  return {};
}

export async function superadminSetPublicMenu(tenantId: string, enabled: boolean): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ public_menu_enabled: enabled }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  return {};
}

export async function superadminSetDashboard(tenantId: string, enabled: boolean): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ dashboard_enabled: enabled }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  return {};
}

export async function superadminSetOwnerAdminPin(
  tenantId: string,
  pinRaw: string,
): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const pin = pinRaw.trim();
  if (!isValidOwnerAdminPin(pin)) {
    return { error: "PIN tam olarak 4 haneli olmalıdır." };
  }

  const svc = await guardAndService();
  const { error } = await svc
    .from("tenants")
    .update({
      owner_admin_pin_hash: hashOwnerAdminPin(pin),
      owner_admin_pin_set_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (error) return { error: error.message };
  revalidatePath("/superadmin");
  revalidatePath("/dashboard/admin", "layout");
  return {};
}

