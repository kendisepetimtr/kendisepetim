import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { getOwnerTenantByUserId } from "@/lib/owner-tenant";
import {
  type AuthCookieSetOptions,
  withSharedAuthCookieOptions,
} from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  buildTenantPanelUrl,
  isCentralDashboardPath,
  pathRequiresOwnerAuth,
} from "@/lib/tenant-routing";
import { resolveAccountKind } from "@/lib/account-kind";
import { AUTH_INTENT_COOKIE, parseAuthIntent } from "@/lib/auth-intent";
import { MUSTERI_HOME_PATH } from "@/lib/musteri/paths";

export type UpdateSessionOptions = {
  /** Verildiğinde yanıt `rewrite` olur; çerez yenilemede de aynı hedef korunur. */
  rewrite?: URL;
  /** Middleware'den gelen tenant slug (subdomain istegi). */
  tenantSlug?: string;
};

const LOGIN_PATH = "/giris";
const FORGOT_PASSWORD_PATH = "/sifremi-unuttum";
const RESET_PASSWORD_PATH = "/sifre-yenile";

function copyCookies(
  from: NextResponse,
  to: NextResponse,
  hostname: string,
  refreshedCookies: { name: string; value: string; options?: AuthCookieSetOptions }[],
) {
  if (refreshedCookies.length > 0) {
    refreshedCookies.forEach(({ name, value, options }) => {
      to.cookies.set(name, value, withSharedAuthCookieOptions(options, hostname));
    });
    return;
  }

  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value, withSharedAuthCookieOptions(undefined, hostname));
  });
}

function createBaseResponse(request: NextRequest, rewrite: URL | undefined) {
  return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next({ request });
}

async function resolveTenantDashboardRedirect(
  request: NextRequest,
  userId: string,
): Promise<NextResponse | null> {
  const tenant = await getOwnerTenantByUserId(userId);
  if (!tenant) return null;

  const target = buildTenantPanelUrl(tenant.subdomain, "/dashboard", request.nextUrl.origin);
  if (target === request.url) return null;

  return NextResponse.redirect(target);
}

/**
 * Auth çerezlerini yeniler; isteğe bağlı subdomain rewrite; dashboard için oturum zorunlu.
 */
export async function updateSession(request: NextRequest, options?: UpdateSessionOptions) {
  const rewrite = options?.rewrite;
  const env = getSupabaseEnv();
  const pathname = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname;
  const hostSlug = options?.tenantSlug ?? parseMenuSubdomainFromHost(request.headers.get("host"));

  if (!env) {
    return createBaseResponse(request, rewrite);
  }

  let supabaseResponse = createBaseResponse(request, rewrite);
  let refreshedCookies: { name: string; value: string; options?: AuthCookieSetOptions }[] = [];

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        refreshedCookies = cookiesToSet.map(({ name, value, options }) => ({
          name,
          value,
          options: withSharedAuthCookieOptions(options, hostname),
        }));
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = createBaseResponse(request, rewrite);
        refreshedCookies.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = pathRequiresOwnerAuth(pathname);
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirectRes = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectRes, hostname, refreshedCookies);
    return redirectRes;
  }

  if (needsAuth && user) {
    const kind = await resolveAccountKind(user);
    const intent = parseAuthIntent(request.cookies.get(AUTH_INTENT_COOKIE)?.value);
    if (kind === "customer" || (kind === "unknown" && intent === "customer")) {
      const url = request.nextUrl.clone();
      url.pathname = MUSTERI_HOME_PATH;
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      copyCookies(supabaseResponse, redirectRes, hostname, refreshedCookies);
      return redirectRes;
    }
  }

  if (user && !hostSlug && isCentralDashboardPath(pathname)) {
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect, hostname, refreshedCookies);
      return tenantRedirect;
    }
  }

  // /giris: oturum açık olsa bile formu göster — son kullanıcıyı otomatik açma

  if ((pathname === "/kayit" || pathname.startsWith("/kayit/")) && user) {
    const kind = await resolveAccountKind(user);
    const intent = parseAuthIntent(request.cookies.get(AUTH_INTENT_COOKIE)?.value);
    if (kind === "customer" || intent === "customer") {
      const url = request.nextUrl.clone();
      url.pathname = MUSTERI_HOME_PATH;
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      copyCookies(supabaseResponse, redirectRes, hostname, refreshedCookies);
      return redirectRes;
    }
    // İşletmesi olmayan restoran kullanıcısı kayıtta kalsın (dashboard ↔ kayit loop olmasın)
    if (request.nextUrl.searchParams.get("reason") === "tenant-missing") {
      return supabaseResponse;
    }
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect, hostname, refreshedCookies);
      return tenantRedirect;
    }
    // Oturum var ama tenant yok → kayıtta kal (dashboard'a zorlama)
    return supabaseResponse;
  }

  if (
    (pathname === FORGOT_PASSWORD_PATH || pathname.startsWith(`${FORGOT_PASSWORD_PATH}/`)) &&
    user
  ) {
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect, hostname, refreshedCookies);
      return tenantRedirect;
    }
    return supabaseResponse;
  }

  /* Şifre sıfırlama bağlantısı oturum açar; kullanıcı bu sayfada kalmalı */
  if (pathname === RESET_PASSWORD_PATH || pathname.startsWith(`${RESET_PASSWORD_PATH}/`)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
