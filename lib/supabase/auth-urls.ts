/** Supabase auth sonrasi uygulama callback rotasi. */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Basarili giris / OAuth sonrasi varsayilan hedef. */
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/** E-posta dogrulama sonrasi giris sayfasi mesaji. */
export const EMAIL_VERIFIED_LOGIN_PATH = "/giris?verified=1";

/** Sifre sifirlama sonrasi form sayfasi. */
export const RESET_PASSWORD_PATH = "/sifre-yenile";

/** Merkezi auth sayfalari — tenant subdomain'den apex'e yonlendirilir. */
export const CENTRAL_AUTH_PATHS = [
  "/giris",
  "/kayit",
  "/musteri/giris",
  "/musteri/kayit",
  AUTH_CALLBACK_PATH,
  "/sifremi-unuttum",
  RESET_PASSWORD_PATH,
] as const;

export function isCentralAuthPath(pathname: string): boolean {
  return CENTRAL_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function buildAuthCallbackUrl(siteBase: string, nextPath = DEFAULT_POST_LOGIN_PATH): string {
  const base = siteBase.replace(/\/$/, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`;
}
