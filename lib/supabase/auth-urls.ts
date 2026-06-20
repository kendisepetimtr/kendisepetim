/** Supabase auth sonrasi uygulama callback rotasi. */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Basarili giris / OAuth sonrasi varsayilan hedef. */
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/** E-posta dogrulama sonrasi giris sayfasi mesaji. */
export const EMAIL_VERIFIED_LOGIN_PATH = "/giris?verified=1";

/** Sifre sifirlama sonrasi form sayfasi. */
export const RESET_PASSWORD_PATH = "/sifre-yenile";

export function buildAuthCallbackUrl(siteBase: string, nextPath = DEFAULT_POST_LOGIN_PATH): string {
  const base = siteBase.replace(/\/$/, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`;
}
