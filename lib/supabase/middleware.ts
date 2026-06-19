import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type UpdateSessionOptions = {
  /** Verildiğinde yanıt `rewrite` olur; çerez yenilemede de aynı hedef korunur. */
  rewrite?: URL;
};

const LOGIN_PATH = "/giris";
const FORGOT_PASSWORD_PATH = "/sifremi-unuttum";
const RESET_PASSWORD_PATH = "/sifre-yenile";
const PROTECTED_PREFIXES = ["/dashboard"];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

function createBaseResponse(request: NextRequest, rewrite: URL | undefined) {
  return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next({ request });
}

/**
 * Auth çerezlerini yeniler; isteğe bağlı subdomain rewrite; /dashboard için oturum zorunlu.
 */
export async function updateSession(request: NextRequest, options?: UpdateSessionOptions) {
  const rewrite = options?.rewrite;
  const env = getSupabaseEnv();
  const pathname = request.nextUrl.pathname;

  if (!env) {
    return createBaseResponse(request, rewrite);
  }

  let supabaseResponse = createBaseResponse(request, rewrite);

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = createBaseResponse(request, rewrite);
        cookiesToSet.forEach(({ name, value, options: o }) => {
          supabaseResponse.cookies.set(name, value, o);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirectRes = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if ((pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) && user) {
    /* E-posta doğrulandıktan sonra başarı mesajını göstermek için bir tur /giris?verified=1 */
    if (request.nextUrl.searchParams.get("verified") === "1") {
      return supabaseResponse;
    }
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
    const redirectRes = NextResponse.redirect(new URL(target, request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if ((pathname === "/kayit" || pathname.startsWith("/kayit/")) && user) {
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (
    (pathname === FORGOT_PASSWORD_PATH || pathname.startsWith(`${FORGOT_PASSWORD_PATH}/`)) &&
    user
  ) {
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  /* Şifre sıfırlama bağlantısı oturum açar; kullanıcı bu sayfada kalmalı */
  if (pathname === RESET_PASSWORD_PATH || pathname.startsWith(`${RESET_PASSWORD_PATH}/`)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
