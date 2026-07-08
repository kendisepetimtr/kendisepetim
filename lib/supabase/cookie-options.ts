/** Apex + tenant subdomain oturum paylasimi (or. kendisepetim.com ve *.kendisepetim.com). */
export const PRODUCTION_AUTH_COOKIE_DOMAIN = ".kendisepetim.com";

export type AuthCookieSetOptions = {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: true | false | "lax" | "strict" | "none";
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
};

export function getSharedAuthCookieDomain(hostname: string): string | undefined {
  const host = hostname.toLowerCase().split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) {
    return undefined;
  }
  if (host === "kendisepetim.com" || host.endsWith(".kendisepetim.com")) {
    return PRODUCTION_AUTH_COOKIE_DOMAIN;
  }
  return undefined;
}

export function withSharedAuthCookieOptions(
  options: AuthCookieSetOptions | undefined,
  hostname: string,
): AuthCookieSetOptions {
  const domain = getSharedAuthCookieDomain(hostname);
  if (!domain) return options ?? {};
  return { ...options, domain };
}
