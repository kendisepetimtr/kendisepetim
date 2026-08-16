import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { withSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { EMAIL_VERIFIED_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { ensureCustomerAccount, resolveAccountKind } from "@/lib/account-kind";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH, isMusteriNextPath } from "@/lib/musteri/paths";
import { getCustomerBlockState } from "@/lib/superadmin/customers-service";
import { AUTH_INTENT_COOKIE, parseAuthIntent } from "@/lib/auth-intent";

function loginRedirect(request: NextRequest, params: Record<string, string>, customer: boolean) {
  const loginUrl = new URL(customer ? MUSTERI_LOGIN_PATH : "/giris", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    loginUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(loginUrl);
}

function copyResponseCookies(from: NextResponse, to: NextResponse, hostname: string) {
  from.cookies.getAll().forEach(({ name, value }) => {
    // Domain kaybolursa oturum yalnızca apex'te kalır; menü subdomain misafir görünür.
    to.cookies.set(name, value, withSharedAuthCookieOptions(undefined, hostname));
  });
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
  const intent = parseAuthIntent(request.cookies.get(AUTH_INTENT_COOKIE)?.value);
  const customerFlow = intent === "customer" || isMusteriNextPath(nextPath);

  if (oauthError) {
    return loginRedirect(request, { durum: "oauth-hata", mesaj: oauthError }, customerFlow);
  }

  if (!env) {
    return loginRedirect(
      request,
      { durum: "oauth-hata", mesaj: "Supabase yapilandirmasi eksik." },
      customerFlow,
    );
  }

  if (!code) {
    return loginRedirect(
      request,
      {
        durum: "oauth-hata",
        mesaj: "Giris kodu bulunamadi. Lutfen tekrar deneyin.",
      },
      customerFlow,
    );
  }

  const hostname = request.nextUrl.hostname;
  const fallbackDest = customerFlow ? MUSTERI_HOME_PATH : nextPath;
  const response = NextResponse.redirect(new URL(fallbackDest, request.nextUrl.origin));

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
    return loginRedirect(request, { durum: "oauth-hata", mesaj: error.message }, customerFlow);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const kind = await resolveAccountKind(user);
    const sendTo = (path: string) => {
      if (path === fallbackDest) return response;
      const to = NextResponse.redirect(new URL(path, request.nextUrl.origin));
      copyResponseCookies(response, to, hostname);
      return to;
    };

    if (kind === "customer" && intent === "restaurant") {
      await supabase.auth.signOut({ scope: "local" });
      const deny = loginRedirect(request, { durum: "yanlis-hesap-turu" }, false);
      copyResponseCookies(response, deny, hostname);
      return deny;
    }

    if (kind === "customer" || customerFlow) {
      if (kind === "restaurant") {
        await supabase.auth.signOut({ scope: "local" });
        const deny = loginRedirect(request, { durum: "yanlis-hesap-turu" }, true);
        copyResponseCookies(response, deny, hostname);
        return deny;
      }
      if (kind !== "customer") {
        await ensureCustomerAccount(user);
      }
      const block = await getCustomerBlockState(user.id);
      if (block.blocked) {
        await supabase.auth.signOut({ scope: "local" });
        const deny = loginRedirect(request, { durum: "hesap-engelli" }, true);
        copyResponseCookies(response, deny, hostname);
        return deny;
      }
      const dest = isMusteriNextPath(nextPath) ? nextPath : MUSTERI_HOME_PATH;
      return sendTo(dest);
    }

    if (kind === "unknown") {
      const kayit = NextResponse.redirect(new URL("/kayit?reason=tenant-missing", request.nextUrl.origin));
      copyResponseCookies(response, kayit, hostname);
      return kayit;
    }

    if (kind === "restaurant") {
      const { resolveOwnerDashboardUrl } = await import("@/lib/owner-tenant");
      const dest = await resolveOwnerDashboardUrl(user.id, request.nextUrl.origin);
      if (dest.startsWith("http")) {
        const to = NextResponse.redirect(dest);
        copyResponseCookies(response, to, hostname);
        return to;
      }
      return sendTo(dest);
    }
  }

  return response;
}
