import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Sunucu tarafı: Server Component, Server Action, Route Handler.
 * İstek başına çağırın; çerezler o anki kullanıcı oturumuna göre bağlanır.
 */
export async function createServerSupabaseClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase ortam değişkenleri eksik. .env.local dosyasını kontrol edin.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component içinde set bazen yasaktır; oturum yenilemeyi middleware üstlenir */
        }
      },
    },
  });
}
