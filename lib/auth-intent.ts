import { getSharedAuthCookieDomain } from "@/lib/supabase/cookie-options";
import { MUSTERI_HOME_PATH, isMusteriAuthPath, isMusteriNextPath } from "@/lib/musteri/paths";

export const AUTH_INTENT_COOKIE = "ks_auth_intent";
export const AUTH_INTENT_MAX_AGE_SEC = 10 * 60;

export type AuthIntent = "customer" | "restaurant";

export function parseAuthIntent(raw: string | null | undefined): AuthIntent | null {
  if (raw === "customer" || raw === "restaurant") return raw;
  return null;
}

/** Giriş/kayıt sayfasına göre kapı: müşteri ve restoran oturumları karışmasın. */
export function authIntentForPathname(pathname: string): AuthIntent | null {
  if (isMusteriAuthPath(pathname)) return "customer";
  if (pathname === "/giris" || pathname.startsWith("/giris/")) return "restaurant";
  if (pathname === "/kayit" || pathname.startsWith("/kayit/")) return "restaurant";
  return null;
}

export function readAuthIntentFromDocumentCookie(): AuthIntent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((p) => p.startsWith(`${AUTH_INTENT_COOKIE}=`));
  return parseAuthIntent(match?.slice(AUTH_INTENT_COOKIE.length + 1));
}

export function inferAuthIntentFromNext(nextPath: string): AuthIntent {
  return isMusteriNextPath(nextPath) ? "customer" : "restaurant";
}

export function destinationForAuthIntent(intent: AuthIntent | null, nextPath: string): string {
  if (intent === "customer" || isMusteriNextPath(nextPath)) {
    return isMusteriNextPath(nextPath) ? nextPath.split("?")[0] || MUSTERI_HOME_PATH : MUSTERI_HOME_PATH;
  }
  return nextPath;
}

export function writeAuthIntentBrowser(intent: AuthIntent): void {
  if (typeof document === "undefined") return;
  const host = window.location.hostname.toLowerCase();
  const domain = getSharedAuthCookieDomain(host);
  const parts = [
    `${AUTH_INTENT_COOKIE}=${intent}`,
    "Path=/",
    `Max-Age=${AUTH_INTENT_MAX_AGE_SEC}`,
    "SameSite=Lax",
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function authIntentCookieSetOptions(hostname: string): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  httpOnly: false;
  secure: boolean;
  domain?: string;
} {
  const domain = getSharedAuthCookieDomain(hostname);
  return {
    path: "/",
    maxAge: AUTH_INTENT_MAX_AGE_SEC,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  };
}
