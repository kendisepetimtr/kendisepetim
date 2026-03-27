import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractTenantSlugFromHostname } from "./lib/tenant";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kendisepetim.com";

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const tenant = extractTenantSlugFromHostname(
    request.headers.get("host") ?? "",
    ROOT_DOMAIN,
  );

  if (!tenant || pathname.startsWith("/t/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/t/${tenant}${pathname === "/" ? "" : pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
