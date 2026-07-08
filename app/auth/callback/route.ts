import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { withSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { EMAIL_VERIFIED_LOGIN_PATH } from "@/lib/supabase/auth-urls";

function loginRedirect(request: NextRequest, params: Record<string, string>) {
  const loginUrl = new URL("/giris", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    loginUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(loginUrl);
}

function resolveNextPath(nextRaw: string | null): string {
  if (nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    return nextRaw;
  }
  return EMAIL_VERIFIED_LOGIN_PATH;
}

/**
 * Supabase e-posta dogrulama / OAuth PKCE donusu.
 * Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   https://siteniz.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const env = getSupabaseEnv();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  const nextPath = resolveNextPath(searchParams.get("next"));

  if (oauthError) {
    return loginRedirect(request, { durum: "oauth-hata", mesaj: oauthError });
  }

  if (!env) {
    return loginRedirect(request, { durum: "oauth-hata", mesaj: "Supabase yapilandirmasi eksik." });
  }

  if (!code) {
    return loginRedirect(request, {
      durum: "oauth-hata",
      mesaj: "Giris kodu bulunamadi. Lutfen tekrar deneyin.",
    });
  }

  const redirectUrl = new URL(nextPath, request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  const hostname = request.nextUrl.hostname;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, withSharedAuthCookieOptions(options, hostname));
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginRedirect(request, { durum: "oauth-hata", mesaj: error.message });
  }

  return response;
}
