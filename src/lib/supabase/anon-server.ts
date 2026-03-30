import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Oturum çerezi kullanmaz; her zaman anon rolüyle okur.
 * slug.localhost / tenant menü sayfaları giriş yapmış kullanıcıda bile herkese açık menüyü gösterir.
 */
export function createAnonServerSupabaseClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* storefront okumalarında oturum yazılmaz */
      },
    },
  });
}
