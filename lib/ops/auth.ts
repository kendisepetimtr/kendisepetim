import { cookies } from "next/headers";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { getKasaFeatures } from "@/lib/kasa/kasa-access";
import { CASHIER_OPS_ACTOR, ownerOpsActor, type OpsActor } from "@/lib/ops/actor";
import { getCurrentOwnerTenant } from "@/lib/owner-admin/guard";
import { OWNER_ADMIN_COOKIE, verifyOwnerAdminToken } from "@/lib/owner-admin/session";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { hasFullTenantAccess } from "@/lib/tenant-entitlements";

export type AuthenticatedOpsTenant =
  | { ok: true; tenant: TenantRow; actor: OpsActor }
  | { ok: false; error: string };

function ownerAdminSessionValid(
  tenant: Pick<TenantRow, "id" | "owner_user_id" | "owner_admin_pin_set_at">,
  rawToken: string | undefined,
): boolean {
  if (!tenant.owner_user_id || !tenant.owner_admin_pin_set_at) return false;
  const payload = verifyOwnerAdminToken(rawToken);
  if (!payload) return false;
  return (
    payload.userId === tenant.owner_user_id &&
    payload.tenantId === tenant.id &&
    payload.pinSetAt === tenant.owner_admin_pin_set_at
  );
}

function ownerOpsAccessError(tenant: TenantRow): string | null {
  if (!hasFullTenantAccess(tenant)) {
    return "Ücretsiz planda sipariş operasyonu kullanılamaz. Deneme süreniz bittiyse Premium’a geçin.";
  }
  const features = getKasaFeatures(tenant);
  if (!features.dineIn && !features.pickup && !features.delivery) {
    return "Sipariş operasyonu için masa, gel-al veya paket aktif olmalıdır.";
  }
  return null;
}

/** Sahip + Admin PIN oturumu (API). Kasa PIN gerekmez. */
export async function getAuthenticatedOwnerAdminTenantByCookie(): Promise<AuthenticatedOpsTenant> {
  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    return { ok: false, error: "Oturum gerekli." };
  }

  const jar = await cookies();
  if (!ownerAdminSessionValid(tenant, jar.get(OWNER_ADMIN_COOKIE)?.value)) {
    return { ok: false, error: "Admin PIN oturumu gerekli." };
  }

  const accessErr = ownerOpsAccessError(tenant);
  if (accessErr) {
    return { ok: false, error: accessErr };
  }

  return { ok: true, tenant, actor: ownerOpsActor(tenant.owner_name) };
}

/**
 * Kasa PIN veya Admin PIN oturumu.
 * Aynı /api/kasa uçları her iki yüzeyden kullanılır; aktör loga yazılır.
 */
export async function getAuthenticatedOpsTenantByCookie(): Promise<AuthenticatedOpsTenant> {
  const cashier = await getAuthenticatedCashierTenantByCookie();
  if (cashier.ok) {
    return { ok: true, tenant: cashier.tenant, actor: CASHIER_OPS_ACTOR };
  }

  const owner = await getAuthenticatedOwnerAdminTenantByCookie();
  if (owner.ok) {
    return owner;
  }

  if (cashier.error === "Kasa oturumu gerekli." || cashier.error === "Kasa oturumu geçersiz.") {
    return { ok: false, error: "Oturum gerekli." };
  }
  return { ok: false, error: cashier.error };
}
