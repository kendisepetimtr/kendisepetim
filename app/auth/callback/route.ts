import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase e-posta doğrulama / OAuth PKCE dönüşü.
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   https://siteniz.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const env = getSupabaseEnv();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/giris?verified=1";

  const redirectUrl = new URL(next, request.nextUrl.origin);

  if (!env) {
    return NextResponse.redirect(new URL("/giris", request.nextUrl.origin));
  }

  const response = NextResponse.redirect(redirectUrl);

  if (code) {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
