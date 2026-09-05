/**
 * Geliştirmede `slug.localhost`, canlıda `slug.kendisepetim.com`
 * isteklerini QR menu tenant'ına eşler.
 */

import { isReservedSubdomain } from "@/lib/superadmin/reserved-subdomains";

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
const PROD_MENU_DOMAIN = "kendisepetim.com";

export function isValidMenuSlug(slug: string): boolean {
  const normalized = slug.toLowerCase();
  return SLUG_RE.test(slug) && !isReservedSubdomain(normalized);
}

/** Host başlığından (örn. `burger.localhost:3000`) menü alt alan adını çıkarır. */
export function parseMenuSubdomainFromHost(
  hostHeader: string | null | undefined,
): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  const parts = host.split(".");
  if (parts.length < 2) return null;

  let slug: string | null = null;

  if (parts.length === 2 && parts[1] === "localhost") {
    slug = parts[0] ?? null;
  } else if (parts.length >= 3 && parts.slice(-2).join(".") === PROD_MENU_DOMAIN) {
    slug = parts[0] ?? null;
  }

  if (!slug || !isValidMenuSlug(slug)) return null;
  return slug.toLowerCase();
}
