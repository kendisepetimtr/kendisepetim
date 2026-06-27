import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

export type ActivityLogsResult =
  | { ok: true; logs: ActivityLogRow[] }
  | { ok: false; error: string };

export async function loadActivityLogs(limit = 200): Promise<ActivityLogsResult> {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) return { ok: false, error: "Oturum bulunamadı." };

  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("activity_logs")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { ok: false, error: error.message };
    return { ok: true, logs: (data ?? []) as ActivityLogRow[] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Loglar yüklenemedi.",
    };
  }
}
