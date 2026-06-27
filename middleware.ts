import { type NextRequest, NextResponse } from "next/server";
import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { updateSession } from "@/lib/supabase/middleware";
import { buildAuthCallbackRedirectUrl } from "@/lib/oauth-redirect";
import { AUTH_CALLBACK_PATH } from "@/lib/supabase/auth-urls";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import { applyTenantSubdomainRewrite } from "@/lib/tenant-routing";

function getCanonicalSiteUrlFromEnv(): string {
  return getCanonicalSiteUrl();
}

/** Supabase Site URL localhost ise OAuth kodu/hatasi canli adrese tasinir. */
function redirectLocalhostAuthParamsToCanonical(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocal) return null;

  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (!code && !error) return null;

  const canonical = getCanonicalSiteUrlFromEnv();
  if (!canonical) return null;

  const url = new URL(request.nextUrl.pathname, canonical);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}

/** Supabase bazen kodu /?code=... olarak birakir; oturum icin /auth/callback'e yonlendir. */
function redirectAuthCodeToCallback(request: NextRequest): NextResponse | null {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return null;

  const pathname = request.nextUrl.pathname;
  if (pathname === AUTH_CALLBACK_PATH || pathname.startsWith(`${AUTH_CALLBACK_PATH}/`)) {
    return null;
  }

  const target = buildAuthCallbackRedirectUrl(
    request.nextUrl.origin,
    request.nextUrl.search,
  );
  return NextResponse.redirect(new URL(target, request.url));
}

function redirectOAuthQueryErrorToLogin(request: NextRequest): NextResponse | null {
  const error = request.nextUrl.searchParams.get("error");
  if (!error) return null;

  const url = request.nextUrl.clone();
  url.pathname = "/giris";
  url.search = "";
  url.searchParams.set("durum", "oauth-hata");
  const desc =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error_code") ??
    error;
  url.searchParams.set("mesaj", desc);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const localhostBounce = redirectLocalhostAuthParamsToCanonical(request);
  if (localhostBounce) return localhostBounce;

  const authCodeRedirect = redirectAuthCodeToCallback(request);
  if (authCodeRedirect) return authCodeRedirect;

  const oauthRedirect = redirectOAuthQueryErrorToLogin(request);
  if (oauthRedirect) return oauthRedirect;

  const host = request.nextUrl.host;
  const slug = parseMenuSubdomainFromHost(host);
  let rewrite: URL | undefined;
  if (slug) {
    const u = request.nextUrl.clone();
    if (applyTenantSubdomainRewrite(slug, u)) {
      rewrite = u;
    }
  }
  return updateSession(request, { rewrite, tenantSlug: slug ?? undefined });
}

export const config = {
  matcher: [
    /*
     * Statik dosya ve görüntüleri hariç tut — gereksiz Supabase çağrısı olmasın.
     */
    "/((?!_next/static|_next/image|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
