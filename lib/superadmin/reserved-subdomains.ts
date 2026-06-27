/** Alt alan adı olarak kullanılmaması gereken kelimeler (çakışma / güvenlik) */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "superadmin",
  "giris",
  "kayit",
  "auth",
  "dashboard",
  "garson",
  "kasa",
  "masa",
  "m",
  "t",
  "static",
  "cdn",
  "mail",
  "ftp",
  "app",
  "dev",
  "staging",
  "test",
  "localhost",
]);

export function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.has(sub.toLowerCase());
}

export function isValidSubdomainFormat(sub: string): boolean {
  if (sub.length < 2) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub);
}
