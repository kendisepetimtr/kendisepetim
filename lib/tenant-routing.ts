import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { isLocalHost } from "@/lib/site-url";

/** Subdomain uzerinden erisilen tenant panel yollari (rewrite hedefi: /m/[slug]/...). */
export const TENANT_PANEL_SEGMENTS = ["dashboard", "admin", "garson", "kasa"] as const;

export type TenantPanelSegment = (typeof TENANT_PANEL_SEGMENTS)[number];

const LEGACY_ADMIN_PREFIX = "/dashboard/admin";

/**
 * slug.kendisepetim.com isteklerini /m/[slug]/... ic rotaya cevirir.
 * Ornek: /dashboard -> /m/burger/dashboard, /masa/5 -> /m/burger/masa/5
 */
export function applyTenantSubdomainRewrite(slug: string, url: URL): boolean {
  if (!isValidMenuSlug(slug)) return false;

  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    url.pathname = `/m/${slug}`;
    return true;
  }

  if (path === "/favicon.ico") {
    url.pathname = `/m/${slug}/favicon`;
    return true;
  }

  if (path.startsWith(`${LEGACY_ADMIN_PREFIX}/`) || path === LEGACY_ADMIN_PREFIX) {
    const suffix = path.slice(LEGACY_ADMIN_PREFIX.length);
    url.pathname = `/m/${slug}/admin${suffix}`;
    return true;
  }

  for (const segment of TENANT_PANEL_SEGMENTS) {
    if (path === `/${segment}` || path.startsWith(`/${segment}/`)) {
      url.pathname = `/m/${slug}${path}`;
      return true;
    }
  }

  const masaMatch = path.match(/^\/masa\/(\d+)(?:\/(.*))?$/);
  if (masaMatch) {
    const tableNumber = masaMatch[1];
    const rest = masaMatch[2] ? `/${masaMatch[2]}` : "";
    url.pathname = `/m/${slug}/masa/${tableNumber}${rest}`;
    return true;
  }

  return false;
}

/** Sahip paneli ve personel rotalari icin tam URL. */
export function buildTenantPanelUrl(
  subdomain: string,
  panelPath: string,
  siteOrigin?: string,
): string {
  const normalizedPath = panelPath.startsWith("/") ? panelPath : `/${panelPath}`;

  if (siteOrigin) {
    try {
      const origin = new URL(siteOrigin);
      if (isLocalHost(origin.hostname)) {
        const port = origin.port && origin.port !== "80" && origin.port !== "443" ? `:${origin.port}` : "";
        return `${origin.protocol}//${subdomain}.localhost${port}${normalizedPath}`;
      }
    } catch {
      /* fall through */
    }
  }

  return `https://${subdomain}.kendisepetim.com${normalizedPath}`;
}

/** Merkezi /dashboard istegi tenant subdomain dashboard'a yonlendirilsin mi? */
export function isCentralDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/** Oturum korumasi gereken dashboard ve admin yollari. */
export function pathRequiresOwnerAuth(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return !pathname.startsWith("/dashboard/admin");
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return true;
  }
  if (/^\/m\/[^/]+\/dashboard(?:\/|$)/.test(pathname)) {
    return true;
  }
  if (/^\/m\/[^/]+\/admin(?:\/|$)/.test(pathname)) {
    return true;
  }
  return false;
}
