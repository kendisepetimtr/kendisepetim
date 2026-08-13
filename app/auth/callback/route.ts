import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { withSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { EMAIL_VERIFIED_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { resolveAccountKind } from "@/lib/account-kind";
import { upsertCustomerProfile } from "@/lib/musteri/customer-profile";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH, isMusteriNextPath } from "@/lib/musteri/paths";
import { getCustomerBlockState } from "@/lib/superadmin/customers-service";

function loginRedirect(request: NextRequest, params: Record<string, string>, customer: boolean) {
  const loginUrl = new URL(customer ? MUSTERI_LOGIN_PATH : "/giris", request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    loginUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(loginUrl);
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
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
  const customerFlow = isMusteriNextPath(nextPath);

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
    return loginRedirect(request, { durum: "oauth-hata", mesaj: error.message }, customerFlow);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const kind = await resolveAccountKind(user);

    if (customerFlow) {
      if (kind === "restaurant") {
        await supabase.auth.signOut({ scope: "local" });
        const deny = loginRedirect(request, { durum: "yanlis-hesap-turu" }, true);
        copyResponseCookies(response, deny);
        return deny;
      }
      if (kind === "unknown") {
        const meta = user.user_metadata ?? {};
        const fullName = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : "";
        const parts = fullName.trim().split(/\s+/);
        const firstName =
          (typeof meta.first_name === "string" && meta.first_name) || parts[0] || "Müşteri";
        const lastName =
          (typeof meta.last_name === "string" && meta.last_name) || parts.slice(1).join(" ");
        await upsertCustomerProfile({
          userId: user.id,
          firstName,
          lastName,
          phone: "",
          email: user.email ?? "",
        });
        await supabase.auth.updateUser({ data: { account_kind: "customer", first_name: firstName, last_name: lastName } });
      }
      const block = await getCustomerBlockState(user.id);
      if (block.blocked) {
        await supabase.auth.signOut({ scope: "local" });
        const deny = loginRedirect(request, { durum: "hesap-engelli" }, true);
        copyResponseCookies(response, deny);
        return deny;
      }
      if (nextPath === "/giris" || nextPath.startsWith("/giris?")) {
        return NextResponse.redirect(new URL(MUSTERI_HOME_PATH, request.nextUrl.origin));
      }
    } else if (kind === "customer") {
      await supabase.auth.signOut({ scope: "local" });
      const deny = loginRedirect(request, { durum: "yanlis-hesap-turu" }, false);
      copyResponseCookies(response, deny);
      return deny;
    }
  }

  return response;
}
