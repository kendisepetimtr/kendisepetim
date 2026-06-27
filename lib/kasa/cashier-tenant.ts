import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import { CASHIER_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/staff/session";

function isValidCashierSessionForTenant(
  tenant: Pick<TenantRow, "id" | "cashier_pin_set_at">,
  rawToken: string | undefined,
): boolean {
  if (!tenant.cashier_pin_set_at) return false;
  const payload = verifyStaffSessionToken(rawToken);
  if (!payload) return false;
  return (
    payload.role === "cashier" &&
    payload.tenantId === tenant.id &&
    payload.pinSetAt === tenant.cashier_pin_set_at
  );
}

export async function getCashierSessionValidForSlug(slug: string): Promise<boolean> {
  const tenant = await getTenantBySubdomain(slug);
  if (!tenant) return false;
  const jar = await cookies();
  return isValidCashierSessionForTenant(tenant, jar.get(CASHIER_SESSION_COOKIE)?.value);
}

export async function getAuthenticatedCashierTenant(
  slug: string,
): Promise<{ ok: true; tenant: TenantRow } | { ok: false; error: string }> {
  const tenant = await getTenantBySubdomain(slug);
  if (!tenant) {
    return { ok: false, error: "İşletme bulunamadı." };
  }
  if (tenant.dine_in_enabled !== true) {
    return { ok: false, error: "Masa servisi kapalı." };
  }
  if ((tenant.table_count ?? 0) < 1) {
    return { ok: false, error: "Masa sayısı tanımlı değil." };
  }
  if (!tenant.cashier_pin_hash || !tenant.cashier_pin_set_at) {
    return { ok: false, error: "Kasa PIN tanımlı değil." };
  }

  const jar = await cookies();
  if (!isValidCashierSessionForTenant(tenant, jar.get(CASHIER_SESSION_COOKIE)?.value)) {
    return { ok: false, error: "Kasa oturumu gerekli." };
  }

  return { ok: true, tenant };
}

export async function getAuthenticatedCashierTenantByCookie(): Promise<
  { ok: true; tenant: TenantRow } | { ok: false; error: string }
> {
  const jar = await cookies();
  const payload = verifyStaffSessionToken(jar.get(CASHIER_SESSION_COOKIE)?.value);
  if (!payload || payload.role !== "cashier") {
    return { ok: false, error: "Kasa oturumu gerekli." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.from("tenants").select("*").eq("id", payload.tenantId).maybeSingle();
    if (error || !data) {
      return { ok: false, error: "İşletme bulunamadı." };
    }
    const tenant = data as TenantRow;
    if (!isValidCashierSessionForTenant(tenant, jar.get(CASHIER_SESSION_COOKIE)?.value)) {
      return { ok: false, error: "Kasa oturumu geçersiz." };
    }
    if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {
      return { ok: false, error: "Masa servisi kullanılamıyor." };
    }
    return { ok: true, tenant };
  } catch {
    return { ok: false, error: "Sunucu yapılandırması eksik." };
  }
}
