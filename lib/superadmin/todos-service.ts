import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import {
  formatVersionLabel,
  type PlatformTodoRow,
  type PlatformVersionRow,
  type TodoStatus,
} from "@/lib/superadmin/todos-types";

function normalizeVersion(row: Record<string, unknown>): PlatformVersionRow {
  const major = Number(row.major);
  const minor = Number(row.minor);
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    major,
    minor,
    is_current: row.is_current === true,
    is_target: row.is_target === true,
    released_at: row.released_at != null ? String(row.released_at) : null,
    label: formatVersionLabel(major, minor),
  };
}

function normalizeTodo(row: Record<string, unknown>): PlatformTodoRow {
  const statusRaw = String(row.status ?? "open");
  const status: TodoStatus =
    statusRaw === "in_progress" || statusRaw === "done" || statusRaw === "cancelled"
      ? statusRaw
      : "open";
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    version_id: String(row.version_id),
    status,
  };
}

export async function loadPlatformVersions(): Promise<
  { ok: true; versions: PlatformVersionRow[] } | { ok: false; error: string }
> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("platform_versions")
      .select("*")
      .order("major", { ascending: false })
      .order("minor", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, versions: (data ?? []).map((r) => normalizeVersion(r as Record<string, unknown>)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sürümler yüklenemedi." };
  }
}

export async function loadPlatformTodos(): Promise<
  { ok: true; todos: PlatformTodoRow[] } | { ok: false; error: string }
> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("platform_todos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, todos: (data ?? []).map((r) => normalizeTodo(r as Record<string, unknown>)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Yapılacaklar yüklenemedi." };
  }
}

async function clearTargetFlag(svc: ReturnType<typeof createServiceSupabaseClient>) {
  const { error } = await svc
    .from("platform_versions")
    .update({ is_target: false, updated_at: new Date().toISOString() })
    .eq("is_target", true);
  return error;
}

async function ensureVersionAsTarget(
  svc: ReturnType<typeof createServiceSupabaseClient>,
  major: number,
  minor: number,
): Promise<{ ok: true; version: PlatformVersionRow } | { ok: false; error: string }> {
  const clearErr = await clearTargetFlag(svc);
  if (clearErr) return { ok: false, error: clearErr.message };

  const { data: existing } = await svc
    .from("platform_versions")
    .select("*")
    .eq("major", major)
    .eq("minor", minor)
    .maybeSingle();

  if (existing) {
    const { data, error } = await svc
      .from("platform_versions")
      .update({ is_target: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Hedef sürüm ayarlanamadı." };
    return { ok: true, version: normalizeVersion(data as Record<string, unknown>) };
  }

  const { data, error } = await svc
    .from("platform_versions")
    .insert({
      major,
      minor,
      is_current: false,
      is_target: true,
      released_at: null,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Sürüm oluşturulamadı." };
  return { ok: true, version: normalizeVersion(data as Record<string, unknown>) };
}

export async function bumpMinorVersion(): Promise<
  { ok: true; version: PlatformVersionRow } | { ok: false; error: string }
> {
  try {
    const versionsResult = await loadPlatformVersions();
    if (!versionsResult.ok) return versionsResult;
    const current = versionsResult.versions.find((v) => v.is_current);
    if (!current) return { ok: false, error: "Mevcut sürüm bulunamadı." };

    const target = versionsResult.versions.find((v) => v.is_target);
    const base = target ?? current;
    const svc = createServiceSupabaseClient();
    return ensureVersionAsTarget(svc, base.major, base.minor + 1);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Küçük güncelleme oluşturulamadı." };
  }
}

export async function bumpMajorVersion(): Promise<
  { ok: true; version: PlatformVersionRow } | { ok: false; error: string }
> {
  try {
    const versionsResult = await loadPlatformVersions();
    if (!versionsResult.ok) return versionsResult;
    const current = versionsResult.versions.find((v) => v.is_current);
    if (!current) return { ok: false, error: "Mevcut sürüm bulunamadı." };

    const nextMajor = current.major + 1;
    const svc = createServiceSupabaseClient();
    return ensureVersionAsTarget(svc, nextMajor, 0);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Büyük güncelleme oluşturulamadı." };
  }
}

export async function publishTargetVersion(): Promise<
  { ok: true; version: PlatformVersionRow } | { ok: false; error: string }
> {
  try {
    const versionsResult = await loadPlatformVersions();
    if (!versionsResult.ok) return versionsResult;
    const target = versionsResult.versions.find((v) => v.is_target);
    if (!target) return { ok: false, error: "Yayınlanacak hedef sürüm yok." };
    if (target.is_current) return { ok: false, error: "Hedef sürüm zaten mevcut sürüm." };

    const svc = createServiceSupabaseClient();
    const now = new Date().toISOString();

    const { error: clearCurrentErr } = await svc
      .from("platform_versions")
      .update({ is_current: false, updated_at: now })
      .eq("is_current", true);
    if (clearCurrentErr) return { ok: false, error: clearCurrentErr.message };

    const { data, error } = await svc
      .from("platform_versions")
      .update({
        is_current: true,
        is_target: false,
        released_at: now,
        updated_at: now,
      })
      .eq("id", target.id)
      .select("*")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Sürüm yayınlanamadı." };
    return { ok: true, version: normalizeVersion(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sürüm yayınlanamadı." };
  }
}

export type TodoInput = {
  id?: string;
  title: string;
  description?: string;
  versionId: string;
  status?: TodoStatus;
};

export async function upsertPlatformTodo(
  input: TodoInput,
): Promise<{ ok: true; todo: PlatformTodoRow } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Başlık zorunludur." };
  if (!input.versionId) return { ok: false, error: "Sürüm seçilmelidir." };

  const status: TodoStatus = input.status ?? "open";
  const now = new Date().toISOString();
  const completedAt = status === "done" || status === "cancelled" ? now : null;

  const payload: Record<string, unknown> = {
    title,
    description: (input.description ?? "").trim(),
    version_id: input.versionId,
    status,
    updated_at: now,
    completed_at: completedAt,
  };

  try {
    const svc = createServiceSupabaseClient();

    if (input.id) {
      const { data: prev } = await svc.from("platform_todos").select("status, completed_at").eq("id", input.id).maybeSingle();
      if (prev) {
        const prevStatus = String(prev.status);
        if (
          (status === "done" || status === "cancelled") &&
          (prevStatus === "done" || prevStatus === "cancelled") &&
          prev.completed_at
        ) {
          payload.completed_at = prev.completed_at;
        }
        if (status === "open" || status === "in_progress") {
          payload.completed_at = null;
        }
      }

      const { data, error } = await svc
        .from("platform_todos")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "Kayıt güncellenemedi." };
      return { ok: true, todo: normalizeTodo(data as Record<string, unknown>) };
    }

    const { data, error } = await svc.from("platform_todos").insert(payload).select("*").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Kayıt eklenemedi." };
    return { ok: true, todo: normalizeTodo(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt kaydedilemedi." };
  }
}

export async function deletePlatformTodo(
  todoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!todoId) return { ok: false, error: "Geçersiz kayıt." };
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("platform_todos").delete().eq("id", todoId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt silinemedi." };
  }
}
