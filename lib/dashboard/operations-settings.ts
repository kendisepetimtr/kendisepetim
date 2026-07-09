import { writeActivityLog } from "@/lib/activity-log";
import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import {
  parseNotificationSettings,
  type TenantNotificationSettings,
} from "@/lib/notification-settings";
import { parseReceiptSettings, type TenantReceiptSettings } from "@/lib/receipt-settings";
import { hashStaffPin, isValidStaffPin, verifyStaffPin, type StaffPinRole } from "@/lib/staff/pin";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import { revalidatePath } from "next/cache";

export type OperationsSettingsState = {
  tableCount: number;
  dineInEnabled: boolean;
  hasAdminPin: boolean;
  hasWaiterPin: boolean;
  hasCashierPin: boolean;
  couriers: CourierRow[];
  notificationSettings: TenantNotificationSettings;
  receiptSettings: TenantReceiptSettings;
  businessName: string;
  subdomain: string;
};

export type OperationsSettingsResult =
  | { ok: true; settings: OperationsSettingsState }
  | { ok: false; error: string };

export type OperationsPatch = {
  tableCount: number;
  dineInEnabled: boolean;
};

export type StaffPinPatch = {
  role: StaffPinRole;
  currentPin?: string;
  newPin: string;
  confirmPin: string;
};

export type CourierInput = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
};

function pinHashField(role: StaffPinRole): "owner_admin_pin_hash" | "waiter_pin_hash" | "cashier_pin_hash" {
  if (role === "admin") return "owner_admin_pin_hash";
  if (role === "waiter") return "waiter_pin_hash";
  return "cashier_pin_hash";
}

function pinSetAtField(role: StaffPinRole): "owner_admin_pin_set_at" | "waiter_pin_set_at" | "cashier_pin_set_at" {
  if (role === "admin") return "owner_admin_pin_set_at";
  if (role === "waiter") return "waiter_pin_set_at";
  return "cashier_pin_set_at";
}

function getStoredPinHash(tenant: Record<string, unknown>, role: StaffPinRole): string | null {
  const key = pinHashField(role);
  const value = tenant[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function loadOperationsSettings(): Promise<OperationsSettingsResult> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    const { data: couriers, error } = await svc
      .from("couriers")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("last_name")
      .order("first_name");

    if (error) return { ok: false, error: error.message };

    const row = tenant as unknown as Record<string, unknown>;

    return {
      ok: true,
      settings: {
        tableCount: tenant.table_count ?? 0,
        dineInEnabled: tenant.dine_in_enabled === true,
        hasAdminPin: Boolean(tenant.owner_admin_pin_hash),
        hasWaiterPin: Boolean(tenant.waiter_pin_hash),
        hasCashierPin: Boolean(tenant.cashier_pin_hash),
        couriers: (couriers ?? []) as CourierRow[],
        notificationSettings: parseNotificationSettings(row.notification_settings),
        receiptSettings: parseReceiptSettings(row.receipt_settings),
        businessName: tenant.business_name ?? tenant.subdomain,
        subdomain: tenant.subdomain,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Ayarlar yüklenemedi.",
    };
  }
}

export async function updateOperationsSettings(
  patch: OperationsPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  const tableCount = Math.min(200, Math.max(0, Math.round(patch.tableCount)));
  const dineInEnabled = patch.dineInEnabled === true;

  if (dineInEnabled && tableCount < 1) {
    return { ok: false, error: "Masa siparişi için en az 1 masa tanımlayın." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc
      .from("tenants")
      .update({
        table_count: tableCount,
        dine_in_enabled: dineInEnabled,
      })
      .eq("id", tenant.id);

    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "operations_settings_updated",
      entity_type: "tenant",
      entity_id: tenant.id,
      order_code: null,
      metadata: { table_count: tableCount, dine_in_enabled: dineInEnabled },
    });

    revalidatePath(`/m/${tenant.subdomain}/dashboard`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Ayarlar kaydedilemedi.",
    };
  }
}

export async function updateStaffPin(
  patch: StaffPinPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  const { role, newPin, confirmPin } = patch;
  const currentPin = patch.currentPin?.trim() ?? "";

  if (!isValidStaffPin(newPin)) {
    return { ok: false, error: "Yeni PIN tam olarak 4 haneli olmalıdır." };
  }
  if (newPin !== confirmPin) {
    return { ok: false, error: "Yeni PIN ve tekrar alanı aynı olmalıdır." };
  }

  const storedHash = getStoredPinHash(tenant as unknown as Record<string, unknown>, role);
  if (storedHash) {
    if (!isValidStaffPin(currentPin)) {
      return { ok: false, error: "Mevcut PIN tam olarak 4 haneli olmalıdır." };
    }
    if (!verifyStaffPin(currentPin, storedHash)) {
      return { ok: false, error: "Mevcut PIN hatalı." };
    }
    if (currentPin === newPin) {
      return { ok: false, error: "Yeni PIN mevcut PIN ile aynı olamaz." };
    }
  }

  const pinSetAt = new Date().toISOString();
  const updatePayload: Record<string, string> = {
    [pinHashField(role)]: hashStaffPin(newPin),
    [pinSetAtField(role)]: pinSetAt,
  };

  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("tenants").update(updatePayload).eq("id", tenant.id);
    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "staff_pin_updated",
      entity_type: "tenant",
      entity_id: tenant.id,
      order_code: null,
      metadata: { role },
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "PIN güncellenemedi.",
    };
  }
}

export async function upsertCourier(
  input: CourierInput,
): Promise<{ ok: true; courier: CourierRow } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "Kurye adı ve soyadı zorunludur." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const payload = {
      tenant_id: tenant.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      is_active: input.isActive !== false,
    };

    if (input.id) {
      const { data, error } = await svc
        .from("couriers")
        .update(payload)
        .eq("id", input.id)
        .eq("tenant_id", tenant.id)
        .select("*")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "Kurye güncellenemedi." };

      await writeActivityLog({
        tenant_id: tenant.id,
        actor_type: "owner",
        actor_label: tenant.owner_name || "Dashboard",
        action: "courier_updated",
        entity_type: "courier",
        entity_id: data.id,
        order_code: null,
        metadata: { name: courierDisplayName(data as CourierRow) },
      });

      return { ok: true, courier: data as CourierRow };
    }

    const { data, error } = await svc.from("couriers").insert(payload).select("*").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Kurye eklenemedi." };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "courier_created",
      entity_type: "courier",
      entity_id: data.id,
      order_code: null,
      metadata: { name: courierDisplayName(data as CourierRow) },
    });

    return { ok: true, courier: data as CourierRow };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kurye kaydedilemedi.",
    };
  }
}

export async function updateNotificationSettings(
  patch: TenantNotificationSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  const settings = parseNotificationSettings(patch);

  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc
      .from("tenants")
      .update({ notification_settings: settings })
      .eq("id", tenant.id);
    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "notification_settings_updated",
      entity_type: "tenant",
      entity_id: tenant.id,
      order_code: null,
      metadata: { soundId: settings.soundId },
    });

    revalidatePath(`/m/${tenant.subdomain}/dashboard`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Bildirim ayarları kaydedilemedi.",
    };
  }
}

export async function updateReceiptSettings(
  patch: TenantReceiptSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  const settings = parseReceiptSettings(patch);

  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc
      .from("tenants")
      .update({ receipt_settings: settings })
      .eq("id", tenant.id);
    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "receipt_settings_updated",
      entity_type: "tenant",
      entity_id: tenant.id,
      order_code: null,
      metadata: { enabled: settings.enabled },
    });

    revalidatePath(`/m/${tenant.subdomain}/dashboard`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fiş ayarları kaydedilemedi.",
    };
  }
}

export async function deleteCourier(courierId: string): Promise<{ ok: false; error: string } | { ok: true }> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };
  if (!courierId) return { ok: false, error: "Geçersiz kurye." };

  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("couriers").delete().eq("id", courierId).eq("tenant_id", tenant.id);
    if (error) return { ok: false, error: error.message };

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "owner",
      actor_label: tenant.owner_name || "Dashboard",
      action: "courier_deleted",
      entity_type: "courier",
      entity_id: courierId,
      order_code: null,
      metadata: {},
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Kurye silinemedi.",
    };
  }
}
