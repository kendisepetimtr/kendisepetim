"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashOwnerAdminPin, isValidOwnerAdminPin } from "@/lib/owner-admin/pin";
import {
  deleteAccountingEntry,
  upsertAccountingEntry,
  type AccountingEntryInput,
} from "@/lib/superadmin/accounting-service";
import { signInSuperadminWithPassword, signOutSuperadmin } from "@/lib/superadmin/auth";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import {
  isReservedSubdomain,
  isValidSubdomainFormat,
} from "@/lib/superadmin/reserved-subdomains";
import { SUPERADMIN_COOKIE } from "@/lib/superadmin/session";
import {
  bumpMajorVersion,
  bumpMinorVersion,
  bumpPatchVersion,
  deletePlatformTodo,
  publishTargetVersion,
  upsertPlatformTodo,
  type TodoInput,
} from "@/lib/superadmin/todos-service";
import {
  deleteSuperadminCustomer,
  setCustomerAdminNote,
  setCustomerBlocked,
} from "@/lib/superadmin/customers-service";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { TenantPlan } from "@/lib/supabase/tenant-types";

export type SuperadminLoginState = { error: string } | null;

function revalidateSuperadminPaths() {
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/isletmeler");
  revalidatePath("/superadmin/muhasebe");
  revalidatePath("/superadmin/yapilacaklar");
  revalidatePath("/superadmin/musteriler");
  revalidatePath("/superadmin/hesap");
}

function revalidatePublicVersionPaths() {
  revalidatePath("/");
}

export async function superadminLoginAction(
  _prev: SuperadminLoginState,
  formData: FormData,
): Promise<SuperadminLoginState> {
  const email = String(formData.get("email") ?? formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await signInSuperadminWithPassword(email, password);
  if (!result.ok) return { error: result.error };

  // Eski HMAC çerezini temizle (geçiş)
  const jar = await cookies();
  jar.delete(SUPERADMIN_COOKIE);

  redirect("/superadmin");
}

export async function superadminLogoutAction(): Promise<void> {
  await signOutSuperadmin();
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
  revalidateSuperadminPaths();
  return {};
}

export async function superadminSetPlan(tenantId: string, plan: TenantPlan): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  if (plan !== "free" && plan !== "premium" && plan !== "lifetime") return { error: "Geçersiz plan." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ plan }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

/** Deneme bitiş tarihi (YYYY-MM-DD veya ISO). Boş = denemeyi kaldır. */
export async function superadminSetTrialEndsAt(
  tenantId: string,
  dateRaw: string,
): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const trimmed = dateRaw.trim();
  let trialEndsAt: string | null = null;
  if (trimmed) {
    // date input → gün sonu UTC (yerel takvim günü korunur: T23:59:59)
    const day = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : trimmed.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Geçersiz tarih." };
    const end = new Date(`${day}T23:59:59.999Z`);
    if (!Number.isFinite(end.getTime())) return { error: "Geçersiz tarih." };
    trialEndsAt = end.toISOString();
  }

  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ trial_ends_at: trialEndsAt }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminSetPublicMenu(tenantId: string, enabled: boolean): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ public_menu_enabled: enabled }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminSetMarketplace(tenantId: string, enabled: boolean): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ marketplace_enabled: enabled }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  revalidatePath("/restoranlar");
  revalidatePath("/kesfet");
  revalidatePath("/musteri");
  revalidatePath("/isletme");
  revalidatePath("/");
  return {};
}

export async function superadminSetDashboard(tenantId: string, enabled: boolean): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc.from("tenants").update({ dashboard_enabled: enabled }).eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminApproveApplication(tenantId: string): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc
    .from("tenants")
    .update({
      application_status: "approved",
      dashboard_enabled: true,
      public_menu_enabled: true,
      rejected_reason: "",
    })
    .eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminRejectApplication(
  tenantId: string,
  reason: string,
): Promise<{ error?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { error } = await svc
    .from("tenants")
    .update({
      application_status: "rejected",
      dashboard_enabled: false,
      public_menu_enabled: false,
      marketplace_enabled: false,
      rejected_reason: reason.trim().slice(0, 500),
    })
    .eq("id", tenantId);
  if (error) return { error: error.message };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminResetTenantPassword(
  tenantId: string,
): Promise<{ error?: string; password?: string }> {
  if (!isUuid(tenantId)) return { error: "Geçersiz kayıt." };
  const svc = await guardAndService();
  const { data: tenant, error: loadErr } = await svc
    .from("tenants")
    .select("id, owner_user_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (loadErr) return { error: loadErr.message };
  if (!tenant?.owner_user_id) return { error: "Bu işletmeye bağlı kullanıcı yok." };

  const { generateOneTimePartnerPassword } = await import("@/lib/partner/password");
  const password = generateOneTimePartnerPassword();
  const { error: authErr } = await svc.auth.admin.updateUserById(tenant.owner_user_id, { password });
  if (authErr) return { error: authErr.message };

  await svc.from("tenant_password_reset_events").insert({
    tenant_id: tenantId,
    owner_user_id: tenant.owner_user_id,
    actor_label: "superadmin",
    note: "one_time_password",
  });

  revalidateSuperadminPaths();
  return { password };
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
  revalidateSuperadminPaths();
  revalidatePath("/admin", "layout");
  return {};
}

export async function superadminUpsertAccountingEntry(
  input: AccountingEntryInput,
): Promise<{ error?: string }> {
  await requireSuperadminOrRedirect();
  const result = await upsertAccountingEntry(input);
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminDeleteAccountingEntry(entryId: string): Promise<{ error?: string }> {
  await requireSuperadminOrRedirect();
  const result = await deleteAccountingEntry(entryId);
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminUpsertTodo(input: TodoInput): Promise<{ error?: string }> {
  await requireSuperadminOrRedirect();
  const result = await upsertPlatformTodo(input);
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminDeleteTodo(todoId: string): Promise<{ error?: string }> {
  await requireSuperadminOrRedirect();
  const result = await deletePlatformTodo(todoId);
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminBumpPatchVersion(): Promise<{ error?: string; label?: string }> {
  await requireSuperadminOrRedirect();
  const result = await bumpPatchVersion();
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  revalidatePublicVersionPaths();
  return { label: result.version.label };
}

export async function superadminBumpMinorVersion(): Promise<{ error?: string; label?: string }> {
  await requireSuperadminOrRedirect();
  const result = await bumpMinorVersion();
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  revalidatePublicVersionPaths();
  return { label: result.version.label };
}

export async function superadminBumpMajorVersion(): Promise<{ error?: string; label?: string }> {
  await requireSuperadminOrRedirect();
  const result = await bumpMajorVersion();
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  revalidatePublicVersionPaths();
  return { label: result.version.label };
}

export async function superadminPublishTargetVersion(): Promise<{ error?: string; label?: string }> {
  await requireSuperadminOrRedirect();
  const result = await publishTargetVersion();
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  revalidatePublicVersionPaths();
  return { label: result.version.label };
}

export async function superadminBlockCustomer(
  userId: string,
  reason: string,
): Promise<{ error?: string }> {
  if (!isUuid(userId)) return { error: "Geçersiz müşteri." };
  await requireSuperadminOrRedirect();
  const result = await setCustomerBlocked({ userId, blocked: true, reason });
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminUnblockCustomer(userId: string): Promise<{ error?: string }> {
  if (!isUuid(userId)) return { error: "Geçersiz müşteri." };
  await requireSuperadminOrRedirect();
  const result = await setCustomerBlocked({ userId, blocked: false });
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminSaveCustomerNote(
  userId: string,
  note: string,
): Promise<{ error?: string }> {
  if (!isUuid(userId)) return { error: "Geçersiz müşteri." };
  await requireSuperadminOrRedirect();
  const result = await setCustomerAdminNote({ userId, note });
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}

export async function superadminDeleteCustomer(userId: string): Promise<{ error?: string }> {
  if (!isUuid(userId)) return { error: "Geçersiz müşteri." };
  await requireSuperadminOrRedirect();
  const result = await deleteSuperadminCustomer(userId);
  if (!result.ok) return { error: result.error };
  revalidateSuperadminPaths();
  return {};
}
