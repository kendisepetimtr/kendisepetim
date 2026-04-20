"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Tarayıcıda (Client Component) çalışan kod için Supabase istemcisi. */
export function createBrowserSupabaseClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase ortam değişkenleri eksik. .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY (veya NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) tanımlayın.",
    );
  }
  return createBrowserClient(env.url, env.anonKey);
}
