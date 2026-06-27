import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import type { TenantRow } from "@/lib/supabase/tenant-types";

/** Dashboard API icin oturum acmis isletme sahibi tenant'i. */
export async function getAuthenticatedOwnerTenant(): Promise<TenantRow | null> {
  const supabase = await tryCreateServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("tenants").select("*").eq("owner_user_id", user.id).maybeSingle();
  if (error || !data) return null;
  return data as TenantRow;
}
