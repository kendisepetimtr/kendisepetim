import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import type { WaiterRow } from "@/lib/supabase/waiter-types";
import { waiterDisplayName } from "@/lib/supabase/waiter-types";
import { getTenantBySubdomain } from "@/lib/staff/tenant-by-slug";
import { verifyStaffSessionToken, WAITER_SESSION_COOKIE } from "@/lib/staff/session";

export type AuthenticatedWaiter = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  pinSetAt: string;
};

async function loadWaiterById(tenantId: string, waiterId: string): Promise<WaiterRow | null> {
  const svc = createServiceSupabaseClient();
  const { data, error } = await svc
    .from("waiters")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", waiterId)
    .maybeSingle();
  if (error || !data) return null;
  return data as WaiterRow;
}

function sessionMatchesWaiter(
  payload: NonNullable<ReturnType<typeof verifyStaffSessionToken>>,
  waiter: WaiterRow,
  tenantId: string,
): boolean {
  return (
    payload.role === "waiter" &&
    payload.tenantId === tenantId &&
    payload.waiterId === waiter.id &&
    payload.pinSetAt === waiter.pin_set_at &&
    waiter.is_active
  );
}

export async function countActiveWaiters(tenantId: string): Promise<number> {
  const svc = createServiceSupabaseClient();
  const { count, error } = await svc
    .from("waiters")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  if (error) return 0;
  return count ?? 0;
}

export async function findWaiterByPin(
  tenantId: string,
  pin: string,
  verifyPin: (pin: string, hash: string) => boolean,
): Promise<WaiterRow | null> {
  const svc = createServiceSupabaseClient();
  const { data, error } = await svc
    .from("waiters")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  if (error || !data) return null;
  for (const row of data as WaiterRow[]) {
    if (verifyPin(pin, row.pin_hash)) return row;
  }
  return null;
}

export async function getWaiterSessionValidForSlug(slug: string): Promise<boolean> {
  const auth = await getAuthenticatedWaiterTenant(slug);
  return auth.ok;
}

export async function getAuthenticatedWaiterTenant(
  slug: string,
): Promise<
  { ok: true; tenant: TenantRow; waiter: AuthenticatedWaiter } | { ok: false; error: string }
> {
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

  const jar = await cookies();
  const payload = verifyStaffSessionToken(jar.get(WAITER_SESSION_COOKIE)?.value);
  if (!payload || payload.role !== "waiter" || payload.tenantId !== tenant.id || !payload.waiterId) {
    return { ok: false, error: "Garson oturumu gerekli." };
  }

  const waiter = await loadWaiterById(tenant.id, payload.waiterId);
  if (!waiter || !sessionMatchesWaiter(payload, waiter, tenant.id)) {
    return { ok: false, error: "Garson oturumu geçersiz." };
  }

  return {
    ok: true,
    tenant,
    waiter: {
      id: waiter.id,
      firstName: waiter.first_name,
      lastName: waiter.last_name,
      displayName: waiterDisplayName(waiter),
      pinSetAt: waiter.pin_set_at,
    },
  };
}

export async function getAuthenticatedWaiterTenantByCookie(): Promise<
  { ok: true; tenant: TenantRow; waiter: AuthenticatedWaiter } | { ok: false; error: string }
> {
  const jar = await cookies();
  const payload = verifyStaffSessionToken(jar.get(WAITER_SESSION_COOKIE)?.value);
  if (!payload || payload.role !== "waiter" || !payload.waiterId) {
    return { ok: false, error: "Garson oturumu gerekli." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.from("tenants").select("*").eq("id", payload.tenantId).maybeSingle();
    if (error || !data) {
      return { ok: false, error: "İşletme bulunamadı." };
    }
    const tenant = data as TenantRow;
    if (tenant.dine_in_enabled !== true || (tenant.table_count ?? 0) < 1) {
      return { ok: false, error: "Masa servisi kullanılamıyor." };
    }

    const waiter = await loadWaiterById(tenant.id, payload.waiterId);
    if (!waiter || !sessionMatchesWaiter(payload, waiter, tenant.id)) {
      return { ok: false, error: "Garson oturumu geçersiz." };
    }

    return {
      ok: true,
      tenant,
      waiter: {
        id: waiter.id,
        firstName: waiter.first_name,
        lastName: waiter.last_name,
        displayName: waiterDisplayName(waiter),
        pinSetAt: waiter.pin_set_at,
      },
    };
  } catch {
    return { ok: false, error: "Sunucu yapılandırması eksik." };
  }
}
