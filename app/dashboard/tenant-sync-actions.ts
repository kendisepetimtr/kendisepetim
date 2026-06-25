"use server";

import type { LocalTenantProfile } from "@/lib/local-tenant";
import { slimTenantProfileForClient } from "@/lib/tenant-client-sync";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";

export type SyncDashboardTenantResult =
  | { ok: true; profile: LocalTenantProfile }
  | { ok: false; error: string };

/** Panel oturumu — tenant profilini sunucudan okur (layout RSC payload taşımaz). */
export async function syncDashboardTenantAction(): Promise<SyncDashboardTenantResult> {
  try {
    const supabase = await tryCreateServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase bağlantısı kurulamadı." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Oturum bulunamadı." };

    const { data: row, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error || !row) return { ok: false, error: "İşletme kaydı bulunamadı." };

    const profile = slimTenantProfileForClient(tenantRowToLocalProfile(row as TenantRow));
    return { ok: true, profile };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Profil senkronu başarısız.",
    };
  }
}
