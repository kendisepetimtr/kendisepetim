import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { SuperadminCustomer } from "@/lib/superadmin/customers-types";

const PROFILE_COLUMNS =
  "user_id, first_name, last_name, phone, email, created_at, updated_at, blocked_at, blocked_reason, admin_note";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mapRow(
  row: Record<string, unknown>,
  extras: { orderCount: number; addressCount: number; emailFallback?: string },
): SuperadminCustomer {
  return {
    userId: String(row.user_id ?? ""),
    firstName: typeof row.first_name === "string" ? row.first_name : "",
    lastName: typeof row.last_name === "string" ? row.last_name : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    email: (typeof row.email === "string" && row.email.trim()) || extras.emailFallback || "",
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
    blockedAt: typeof row.blocked_at === "string" ? row.blocked_at : null,
    blockedReason: typeof row.blocked_reason === "string" ? row.blocked_reason : "",
    adminNote: typeof row.admin_note === "string" ? row.admin_note : "",
    orderCount: extras.orderCount,
    addressCount: extras.addressCount,
  };
}

async function loadAuthEmails(userIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (userIds.length === 0) return out;
  try {
    const svc = createServiceSupabaseClient();
    const missing = new Set(userIds);
    let page = 1;
    while (missing.size > 0 && page <= 20) {
      const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (missing.has(u.id) && u.email) {
          out[u.id] = u.email;
          missing.delete(u.id);
        }
      }
      if (data.users.length < 200) break;
      page += 1;
    }
  } catch {
    /* e-posta yoksa boş kalır */
  }
  return out;
}

async function countByUserId(
  table: "orders" | "customer_addresses",
  column: "customer_user_id" | "user_id",
  userIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, 0]));
  if (userIds.length === 0) return counts;
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc.from(table).select(column).in(column, userIds);
    if (error || !data) return counts;
    for (const item of data as unknown[]) {
      if (!isRecord(item)) continue;
      const raw = item[column];
      const id = typeof raw === "string" ? raw : "";
      if (id && id in counts) counts[id] += 1;
    }
  } catch {
    /* tablo yoksa 0 */
  }
  return counts;
}

export async function countCustomerProfiles(): Promise<number> {
  try {
    const svc = createServiceSupabaseClient();
    const { count, error } = await svc.from("customer_profiles").select("user_id", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listSuperadminCustomers(): Promise<
  { ok: true; customers: SuperadminCustomer[] } | { ok: false; error: string }
> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_profiles")
      .select(PROFILE_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("does not exist") || error.code === "42P01") {
        return {
          ok: false,
          error: "customer_profiles tablosu yok. 20260813160000_customer_accounts.sql migration'ını uygulayın.",
        };
      }
      if (error.message.includes("blocked_at") || error.message.includes("admin_note")) {
        return {
          ok: false,
          error: "Müşteri yönetim kolonları yok. 20260813170000_customer_admin_moderation.sql migration'ını uygulayın.",
        };
      }
      return { ok: false, error: error.message };
    }

    const rows = (data ?? []).filter(isRecord);
    const ids = rows.map((r) => String(r.user_id ?? "")).filter(Boolean);
    const needEmail = ids.filter((id) => {
      const row = rows.find((r) => String(r.user_id) === id);
      return !String(row?.email ?? "").trim();
    });

    const [emails, orderCounts, addressCounts] = await Promise.all([
      loadAuthEmails(needEmail),
      countByUserId("orders", "customer_user_id", ids),
      countByUserId("customer_addresses", "user_id", ids),
    ]);

    const customers = rows.map((row) => {
      const id = String(row.user_id ?? "");
      return mapRow(row, {
        orderCount: orderCounts[id] ?? 0,
        addressCount: addressCounts[id] ?? 0,
        emailFallback: emails[id],
      });
    });

    return { ok: true, customers };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Müşteriler yüklenemedi." };
  }
}

export async function setCustomerBlocked(input: {
  userId: string;
  blocked: boolean;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc
      .from("customer_profiles")
      .update({
        blocked_at: input.blocked ? new Date().toISOString() : null,
        blocked_reason: input.blocked ? (input.reason ?? "").trim() : "",
      })
      .eq("user_id", input.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Engel güncellenemedi." };
  }
}

export async function setCustomerAdminNote(input: {
  userId: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc
      .from("customer_profiles")
      .update({ admin_note: input.note.trim() })
      .eq("user_id", input.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not kaydedilemedi." };
  }
}

export async function deleteSuperadminCustomer(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("customer_profiles").delete().eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    try {
      await svc.auth.admin.deleteUser(userId);
    } catch {
      /* profil silindi; auth hesabı kalırsa tekrar kayıt olamaz / giriş reddedilir */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Müşteri silinemedi." };
  }
}

export async function getCustomerBlockState(userId: string): Promise<{
  blocked: boolean;
  reason: string;
}> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("customer_profiles")
      .select("blocked_at, blocked_reason")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return { blocked: false, reason: "" };
    return {
      blocked: Boolean(data.blocked_at),
      reason: typeof data.blocked_reason === "string" ? data.blocked_reason : "",
    };
  } catch {
    return { blocked: false, reason: "" };
  }
}

export const CUSTOMER_BLOCKED_LOGIN_MESSAGE =
  "Bu müşteri hesabı kapatıldı. Sipariş ve giriş şu an kullanılamaz.";
