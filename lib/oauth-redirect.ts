import { AUTH_CALLBACK_PATH, DEFAULT_POST_LOGIN_PATH } from "@/lib/supabase/auth-urls";

/** OAuth hata parametreleri query (?error=) veya hash (#error=) icinde mi? */
export function urlHasOAuthError(search: string, hash: string): boolean {
  if (search.includes("error=")) return true;
  if (hash.includes("error")) return true;
  return false;
}

/** Supabase PKCE kodu (?code=) var mi? */
export function readAuthCode(search: string): string | null {
  const code = new URLSearchParams(search).get("code");
  return code?.trim() ? code : null;
}

export function urlHasAuthCallbackParams(search: string, hash: string): boolean {
  if (readAuthCode(search)) return true;
  return urlHasOAuthError(search, hash);
}

export function buildAuthCallbackRedirectUrl(
  origin: string,
  search: string,
  defaultNext = DEFAULT_POST_LOGIN_PATH,
): string {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const nextRaw = params.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : defaultNext;

  const callback = new URL(AUTH_CALLBACK_PATH, origin);
  if (code) callback.searchParams.set("code", code);
  callback.searchParams.set("next", next);

  for (const key of ["error", "error_code", "error_description"] as const) {
    const value = params.get(key);
    if (value) callback.searchParams.set(key, value);
  }

  return `${callback.pathname}${callback.search}`;
}

export function readOAuthErrorMessage(search: string, hash: string): string | null {
  const query = new URLSearchParams(search);
  const fromQuery = query.get("error_description") ?? query.get("error");
  if (fromQuery) return fromQuery;

  if (!hash || !hash.includes("error")) return null;
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return hashParams.get("error_description") ?? hashParams.get("error");
}
