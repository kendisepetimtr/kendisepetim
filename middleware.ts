import { type NextRequest, NextResponse } from "next/server";
import { parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { updateSession } from "@/lib/supabase/middleware";

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
  const oauthRedirect = redirectOAuthQueryErrorToLogin(request);
  if (oauthRedirect) return oauthRedirect;

  const host = request.headers.get("host");
  const slug = parseMenuSubdomainFromHost(host);
  let rewrite: URL | undefined;
  if (slug && request.nextUrl.pathname === "/") {
    const u = request.nextUrl.clone();
    u.pathname = `/m/${slug}`;
    rewrite = u;
  } else if (slug && request.nextUrl.pathname === "/favicon.ico") {
    const u = request.nextUrl.clone();
    u.pathname = `/m/${slug}/favicon`;
    rewrite = u;
  }
  return updateSession(request, { rewrite });
}

export const config = {
  matcher: [
    /*
     * Statik dosya ve görüntüleri hariç tut — gereksiz Supabase çağrısı olmasın.
     */
    "/((?!_next/static|_next/image|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
