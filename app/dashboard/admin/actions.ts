"use server";

import { writeActivityLog } from "@/lib/activity-log";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { getCurrentOwnerTenant, getOwnerAdminSessionValid } from "@/lib/owner-admin/guard";
import { hashOwnerAdminPin, isValidOwnerAdminPin, verifyOwnerAdminPin } from "@/lib/owner-admin/pin";
import {
  OWNER_ADMIN_COOKIE,
  mintOwnerAdminToken,
  ownerAdminCookieOptions,
} from "@/lib/owner-admin/session";
import type { OrderStatus } from "@/lib/supabase/order-types";
import { revalidatePath } from "next/cache";

export type OwnerAdminPinActionState =
  | {
      error?: string;
      success?: string;
    }
  | null;

function normalizeNextPath(nextRaw: string): string {
  if (nextRaw.startsWith("/admin")) return nextRaw;
  if (nextRaw.startsWith("/dashboard/admin")) return nextRaw.replace("/dashboard/admin", "/admin");
  return "/admin";
}

export async function verifyOwnerAdminPinAction(
  _prev: OwnerAdminPinActionState,
  formData: FormData,
): Promise<OwnerAdminPinActionState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = normalizeNextPath(String(formData.get("next") ?? "/admin"));

  if (!isValidOwnerAdminPin(pin)) {
    return { error: "PIN tam olarak 4 haneli olmalıdır." };
  }

  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    return { error: "Oturum bulunamadı. Tekrar giriş yapın." };
  }
  if (!tenant.owner_admin_pin_hash || !tenant.owner_admin_pin_set_at) {
    return { error: "Bu restoran için patron PIN henüz tanımlanmadı." };
  }
  if (!verifyOwnerAdminPin(pin, tenant.owner_admin_pin_hash)) {
    return { error: "PIN hatalı." };
  }

  const token = mintOwnerAdminToken({
    tenantId: tenant.id,
    userId: tenant.owner_user_id,
    pinSetAt: tenant.owner_admin_pin_set_at,
  });
  if (!token) {
    return { error: "OWNER_ADMIN_SESSION_SECRET eksik veya çok kısa." };
  }

  const jar = await cookies();
  jar.set(OWNER_ADMIN_COOKIE, token, ownerAdminCookieOptions());
  redirect(next);
}

export async function changeOwnerAdminPinAction(
  _prev: OwnerAdminPinActionState,
  formData: FormData,
): Promise<OwnerAdminPinActionState> {
  const currentPin = String(formData.get("currentPin") ?? "").trim();
  const newPin = String(formData.get("newPin") ?? "").trim();
  const confirmPin = String(formData.get("confirmPin") ?? "").trim();

  if (!isValidOwnerAdminPin(currentPin)) {
    return { error: "Mevcut PIN tam olarak 4 haneli olmalıdır." };
  }
  if (!isValidOwnerAdminPin(newPin)) {
    return { error: "Yeni PIN tam olarak 4 haneli olmalıdır." };
  }
  if (newPin !== confirmPin) {
    return { error: "Yeni PIN ve tekrar alanı aynı olmalıdır." };
  }
  if (newPin === currentPin) {
    return { error: "Yeni PIN mevcut PIN ile aynı olamaz." };
  }

  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    return { error: "Oturum bulunamadı. Tekrar giriş yapın." };
  }
  if (!tenant.owner_admin_pin_hash || !tenant.owner_admin_pin_set_at) {
    return { error: "Bu restoran için henüz bir PIN tanımlı değil." };
  }
  if (!verifyOwnerAdminPin(currentPin, tenant.owner_admin_pin_hash)) {
    return { error: "Mevcut PIN hatalı." };
  }

  const pinSetAt = new Date().toISOString();
  const svc = createServiceSupabaseClient();
  const { error } = await svc
    .from("tenants")
    .update({
      owner_admin_pin_hash: hashOwnerAdminPin(newPin),
      owner_admin_pin_set_at: pinSetAt,
    })
    .eq("id", tenant.id)
    .eq("owner_user_id", tenant.owner_user_id);

  if (error) {
    return { error: error.message };
  }

  const token = mintOwnerAdminToken({
    tenantId: tenant.id,
    userId: tenant.owner_user_id,
    pinSetAt,
  });
  if (!token) {
    return { error: "OWNER_ADMIN_SESSION_SECRET eksik veya çok kısa." };
  }

  const jar = await cookies();
  jar.set(OWNER_ADMIN_COOKIE, token, ownerAdminCookieOptions());
  return { success: "PIN başarıyla güncellendi." };
}

export async function cancelAdminOrderAction(orderId: string): Promise<{ error?: string }> {
  if (!orderId) {
    return { error: "Geçersiz sipariş." };
  }

  const tenant = await getCurrentOwnerTenant();
  if (!tenant?.owner_user_id) {
    return { error: "Oturum bulunamadı." };
  }
  if (!(await getOwnerAdminSessionValid())) {
    return { error: "Admin PIN oturumu gerekli." };
  }

  const svc = createServiceSupabaseClient();
  const { data: existing, error: findErr } = await svc
    .from("orders")
    .select("id, order_code, status, fulfillment_type")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (findErr || !existing) {
    return { error: "Sipariş bulunamadı." };
  }
  if (existing.status === "cancelled") {
    return { error: "Sipariş zaten iptal edilmiş." };
  }
  if (existing.status === "completed") {
    return { error: "Tamamlanmış sipariş iptal edilemez." };
  }

  const { error } = await svc
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("tenant_id", tenant.id);

  if (error) {
    return { error: error.message };
  }

  await writeActivityLog({
    tenant_id: tenant.id,
    actor_type: "admin",
    actor_label: tenant.owner_name || "Admin",
    action: "order_cancelled",
    entity_type: "order",
    entity_id: orderId,
    order_code: existing.order_code as string,
    metadata: {
      from: existing.status,
      fulfillment_type: existing.fulfillment_type,
      panel: "admin",
    },
  });

  revalidatePath("/admin");
  return {};
}

/** @deprecated Admin yalnizca iptal edebilir — cancelAdminOrderAction kullanin. */
export async function updateOwnerOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<{ error?: string }> {
  if (status !== "cancelled") {
    return { error: "Admin panelinde yalnızca iptal yapılabilir." };
  }
  return cancelAdminOrderAction(orderId);
}
