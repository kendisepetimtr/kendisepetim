import {
  isReservedSubdomain,
  isValidSubdomainFormat,
} from "@/lib/superadmin/reserved-subdomains";

export function slugifyBusinessName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function allocatePartnerSubdomain(
  taken: (subdomain: string) => Promise<boolean>,
  businessName: string,
): Promise<string> {
  const base = slugifyBusinessName(businessName);
  const stem = base.length >= 2 && !isReservedSubdomain(base) && isValidSubdomainFormat(base) ? base : "restoran";

  for (let i = 0; i < 80; i += 1) {
    const candidate = i === 0 ? stem : `${stem}-${i + 1}`.slice(0, 48);
    if (!isValidSubdomainFormat(candidate) || isReservedSubdomain(candidate)) continue;
    if (!(await taken(candidate))) return candidate;
  }

  const fallback = `r-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return fallback;
}
