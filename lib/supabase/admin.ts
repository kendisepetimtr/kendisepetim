import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS’yi bypass eder — yalnızca Server Action, Route Handler, cron vb.
 * Asla client bundle’a import etmeyin.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Sunucu Supabase istemcisi için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env.local).",
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
