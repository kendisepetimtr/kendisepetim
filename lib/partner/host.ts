import { isLocalHost } from "@/lib/site-url";

export const PARTNER_SUBDOMAIN = "partner";
export const PARTNER_PRODUCTION_HOST = "partner.kendisepetim.com";
export const PARTNER_PRODUCTION_ORIGIN = `https://${PARTNER_PRODUCTION_HOST}`;
export const PARTNER_PENDING_PATH = "/beklemede";

export function hostnameWithoutPort(hostHeader: string | null | undefined): string {
  return (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
}

export function isPartnerHost(hostHeader: string | null | undefined): boolean {
  const host = hostnameWithoutPort(hostHeader);
  return host === "partner.localhost" || host === PARTNER_PRODUCTION_HOST;
}

export function getPartnerOrigin(fromOrigin: string): string {
  try {
    const origin = new URL(fromOrigin);
    if (isLocalHost(origin.hostname)) {
      const port = origin.port && origin.port !== "80" && origin.port !== "443" ? `:${origin.port}` : "";
      return `${origin.protocol}//partner.localhost${port}`;
    }
  } catch {
    /* fall through */
  }
  return PARTNER_PRODUCTION_ORIGIN;
}

export function partnerAbsoluteUrl(pathname: string, fromOrigin: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getPartnerOrigin(fromOrigin)}${path}`;
}

/** www / apex üzerindeki restoran kayıt-giriş yolları partner’a taşınır. */
export function isRestaurantPortalPath(pathname: string): boolean {
  return (
    pathname === "/giris" ||
    pathname.startsWith("/giris/") ||
    pathname === "/kayit" ||
    pathname.startsWith("/kayit/") ||
    pathname === PARTNER_PENDING_PATH ||
    pathname.startsWith(`${PARTNER_PENDING_PATH}/`)
  );
}
