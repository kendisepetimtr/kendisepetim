import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { getOwnerTenantByUserId } from "@/lib/owner-tenant";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  buildTenantPanelUrl,
  isCentralDashboardPath,
  pathRequiresOwnerAuth,
} from "@/lib/tenant-routing";

export type UpdateSessionOptions = {
  /** Verildiğinde yanıt `rewrite` olur; çerez yenilemede de aynı hedef korunur. */
  rewrite?: URL;
  /** Middleware'den gelen tenant slug (subdomain istegi). */
  tenantSlug?: string;
};

const LOGIN_PATH = "/giris";
const FORGOT_PASSWORD_PATH = "/sifremi-unuttum";
const RESET_PASSWORD_PATH = "/sifre-yenile";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
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
  const hostSlug = options?.tenantSlug ?? parseMenuSubdomainFromHost(request.headers.get("host"));

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

  const needsAuth = pathRequiresOwnerAuth(pathname);
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirectRes = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (user && !hostSlug && isCentralDashboardPath(pathname)) {
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect);
      return tenantRedirect;
    }
  }

  if ((pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) && user) {
    /* E-posta doğrulandıktan sonra başarı mesajını göstermek için bir tur /giris?verified=1 */
    if (request.nextUrl.searchParams.get("verified") === "1") {
      return supabaseResponse;
    }
    const nextParam = request.nextUrl.searchParams.get("next");
    let target = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

    if (target === "/dashboard" || target.startsWith("/dashboard/")) {
      const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
      if (tenantRedirect) {
        copyCookies(supabaseResponse, tenantRedirect);
        return tenantRedirect;
      }
    }

    const redirectRes = NextResponse.redirect(new URL(target, request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if ((pathname === "/kayit" || pathname.startsWith("/kayit/")) && user) {
    if (request.nextUrl.searchParams.get("reason") === "tenant-missing") {
      return supabaseResponse;
    }
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect);
      return tenantRedirect;
    }
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (
    (pathname === FORGOT_PASSWORD_PATH || pathname.startsWith(`${FORGOT_PASSWORD_PATH}/`)) &&
    user
  ) {
    const tenantRedirect = await resolveTenantDashboardRedirect(request, user.id);
    if (tenantRedirect) {
      copyCookies(supabaseResponse, tenantRedirect);
      return tenantRedirect;
    }
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
