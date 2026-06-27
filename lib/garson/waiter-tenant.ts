import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import { verifyStaffSessionToken, WAITER_SESSION_COOKIE } from "@/lib/staff/session";

function isValidWaiterSessionForTenant(
  tenant: Pick<TenantRow, "id" | "waiter_pin_set_at">,
  rawToken: string | undefined,
): boolean {
  if (!tenant.waiter_pin_set_at) return false;
  const payload = verifyStaffSessionToken(rawToken);
  if (!payload) return false;
  return (
    payload.role === "waiter" &&
    payload.tenantId === tenant.id &&
    payload.pinSetAt === tenant.waiter_pin_set_at
  );
}

export async function getWaiterSessionValidForSlug(slug: string): Promise<boolean> {
  const tenant = await getTenantBySubdomain(slug);
  if (!tenant) return false;
  const jar = await cookies();
  return isValidWaiterSessionForTenant(tenant, jar.get(WAITER_SESSION_COOKIE)?.value);
}

export async function getAuthenticatedWaiterTenant(
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
  if (!tenant.waiter_pin_hash || !tenant.waiter_pin_set_at) {
    return { ok: false, error: "Garson PIN tanımlı değil." };
  }

  const jar = await cookies();
  if (!isValidWaiterSessionForTenant(tenant, jar.get(WAITER_SESSION_COOKIE)?.value)) {
    return { ok: false, error: "Garson oturumu gerekli." };
  }

  return { ok: true, tenant };
}

/** API icin slug'siz dogrulama — cookie tenant id ile eslesir. */
export async function getAuthenticatedWaiterTenantByCookie(): Promise<
  { ok: true; tenant: TenantRow } | { ok: false; error: string }
> {
  const jar = await cookies();
  const payload = verifyStaffSessionToken(jar.get(WAITER_SESSION_COOKIE)?.value);
  if (!payload || payload.role !== "waiter") {
    return { ok: false, error: "Garson oturumu gerekli." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.from("tenants").select("*").eq("id", payload.tenantId).maybeSingle();
    if (error || !data) {
      return { ok: false, error: "İşletme bulunamadı." };
    }
    const tenant = data as TenantRow;
    if (!isValidWaiterSessionForTenant(tenant, jar.get(WAITER_SESSION_COOKIE)?.value)) {
      return { ok: false, error: "Garson oturumu geçersiz." };
    }
    if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {
      return { ok: false, error: "Masa servisi kullanılamıyor." };
    }
    return { ok: true, tenant };
  } catch {
    return { ok: false, error: "Sunucu yapılandırması eksik." };
  }
}
