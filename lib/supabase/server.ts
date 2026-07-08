import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { withSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function getRequestHostname(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim() ?? "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

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
  const hostname = await getRequestHostname();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, withSharedAuthCookieOptions(options, hostname));
          });
        } catch {
          /* Server Component içinde set bazen yasaktır; oturum yenilemeyi middleware üstlenir */
        }
      },
    },
  });
}

/** Server action'larda throw yerine null döner. */
export async function tryCreateServerSupabaseClient() {
  try {
    if (!getSupabaseEnv()) return null;
    return await createServerSupabaseClient();
  } catch {
    return null;
  }
}
