import { normalizeDevelopmentHostname } from "./hostname";
import { isValidTenantSlug, normalizeTenantSlug } from "./slug";

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api"]);

export function extractTenantSlugFromHostname(
  hostHeader: string,
  rootDomain = "kendisepetim.com",
): string | null {
  const hostname = normalizeDevelopmentHostname(hostHeader);
  if (!hostname) return null;

  // tenant.localhost -> tenant (local development)
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    const parts = hostname.split(".");
    if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
      const candidate = normalizeTenantSlug(parts[0]);
      if (RESERVED_SUBDOMAINS.has(candidate)) return null;
      return isValidTenantSlug(candidate) ? candidate : null;
    }
    return null;
  }

  if (hostname === rootDomain) return null;

  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const subdomain = normalizeTenantSlug(hostname.slice(0, -suffix.length));
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;

  return isValidTenantSlug(subdomain) ? subdomain : null;
}

export function getDomainRequestType(
  hostHeader: string,
  rootDomain = "kendisepetim.com",
): "main" | "tenant" {
  return extractTenantSlugFromHostname(hostHeader, rootDomain) ? "tenant" : "main";
}
