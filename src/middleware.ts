import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractTenantSlugFromHostname } from "./lib/tenant";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kendisepetim.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.includes(".")
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function isSuperadminHost(hostHeader: string, rootDomain: string): boolean {
  const host = hostHeader.split(":")[0].trim().toLowerCase();
  if (!host) return false;
  return host === `superadmin.${rootDomain}` || host === "superadmin.localhost";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.getUser();
  }

  const hostHeader = request.headers.get("host") ?? "";
  if (isSuperadminHost(hostHeader, ROOT_DOMAIN)) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      const rewrite = NextResponse.rewrite(url);
      copyCookies(response, rewrite);
      return rewrite;
    }
    if (pathname.startsWith("/admin")) {
      return response;
    }
    return response;
  }

  const tenant = extractTenantSlugFromHostname(
    hostHeader,
    ROOT_DOMAIN,
  );

  if (!tenant || pathname.startsWith("/t/")) {
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/t/${tenant}${pathname === "/" ? "" : pathname}`;

  const rewrite = NextResponse.rewrite(url);
  copyCookies(response, rewrite);
  return rewrite;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
