import {
  hashSuperadminPassword,
  isValidSuperadminPassword,
  isValidSuperadminUsername,
  verifySuperadminPassword,
} from "@/lib/superadmin/password";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

export type SuperadminUserPublic = {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SuperadminUserRow = SuperadminUserPublic & {
  password_hash: string;
};

function toPublic(row: SuperadminUserRow): SuperadminUserPublic {
  return {
    id: row.id,
    username: row.username,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function countSuperadminUsers(): Promise<number> {
  try {
    const svc = createServiceSupabaseClient();
    const { count, error } = await svc
      .from("superadmin_users")
      .select("id", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function listSuperadminUsers(): Promise<
  { ok: true; users: SuperadminUserPublic[] } | { ok: false; error: string }
> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("superadmin_users")
      .select("id, username, is_active, created_at, updated_at")
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, users: (data ?? []) as SuperadminUserPublic[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kullanıcılar yüklenemedi." };
  }
}

export async function authenticateSuperadminUser(
  usernameRaw: string,
  password: string,
): Promise<{ ok: true; user: SuperadminUserPublic } | { ok: false; error: string }> {
  const username = usernameRaw.trim();
  if (!username || !password) {
    return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("superadmin_users")
      .select("*")
      .ilike("username", username)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      // Tablo yoksa bootstrap için özel mesaj
      if (error.message.includes("does not exist") || error.code === "42P01") {
        return { ok: false, error: "superadmin_users tablosu yok. Migration uygulayın." };
      }
      return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
    }

    if (!data) {
      return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
    }

    const row = data as SuperadminUserRow;
    if (!verifySuperadminPassword(password, row.password_hash)) {
      return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
    }

    return { ok: true, user: toPublic(row) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Giriş doğrulanamadı." };
  }
}

export async function upsertSuperadminUser(input: {
  id?: string;
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true; user: SuperadminUserPublic } | { ok: false; error: string }> {
  const username = input.username.trim();
  if (!isValidSuperadminUsername(username)) {
    return {
      ok: false,
      error: "Kullanıcı adı 3–64 karakter; harf, rakam, . _ - kullanılabilir.",
    };
  }
  if (!isValidSuperadminPassword(input.password)) {
    return { ok: false, error: "Şifre en az 8 karakter olmalıdır." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "Şifre ve tekrar alanı aynı olmalıdır." };
  }

  try {
    const svc = createServiceSupabaseClient();
    const password_hash = hashSuperadminPassword(input.password);
    const now = new Date().toISOString();

    if (input.id) {
      const { data, error } = await svc
        .from("superadmin_users")
        .update({
          username,
          password_hash,
          updated_at: now,
        })
        .eq("id", input.id)
        .select("id, username, is_active, created_at, updated_at")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "Güncellenemedi." };
      return { ok: true, user: data as SuperadminUserPublic };
    }

    const { data, error } = await svc
      .from("superadmin_users")
      .insert({
        username,
        password_hash,
        is_active: true,
      })
      .select("id, username, is_active, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Bu kullanıcı adı zaten kayıtlı." };
      }
      return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: "Kullanıcı eklenemedi." };
    return { ok: true, user: data as SuperadminUserPublic };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kullanıcı kaydedilemedi." };
  }
}

export async function deleteSuperadminUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId) return { ok: false, error: "Geçersiz kullanıcı." };
  try {
    const svc = createServiceSupabaseClient();
    const count = await countSuperadminUsers();
    if (count <= 1) {
      return { ok: false, error: "Son süperadmin kullanıcısı silinemez." };
    }
    const { error } = await svc.from("superadmin_users").delete().eq("id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Silinemedi." };
  }
}
