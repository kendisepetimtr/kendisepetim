/** Müşteri paneli yolları ve alt/sol navigasyon. */

export const MUSTERI_HOME_PATH = "/musteri";
export const MUSTERI_ORDERS_PATH = "/musteri/siparisler";
export const MUSTERI_FAVORITES_PATH = "/musteri/favoriler";
export const MUSTERI_ADDRESSES_PATH = "/musteri/adresler";
export const MUSTERI_ACCOUNT_PATH = "/musteri/hesap";
export const MUSTERI_LOGIN_PATH = "/musteri/giris";
export const MUSTERI_REGISTER_PATH = "/musteri/kayit";

export const ISLETME_HOME_PATH = "/isletme";

export const CUSTOMER_EMAIL_VERIFIED_LOGIN_PATH = `${MUSTERI_LOGIN_PATH}?verified=1`;

export type MusteriNavTab = {
  href: string;
  label: string;
  icon: string;
  /** Misafir tıklayınca giriş zorunlu (Keşfet hariç) */
  requiresAuth: boolean;
  /** Alt barda ortada vurgulu */
  center?: boolean;
};

export const MUSTERI_NAV_TABS: MusteriNavTab[] = [
  { href: MUSTERI_HOME_PATH, label: "Keşfet", icon: "restaurant", requiresAuth: false },
  { href: MUSTERI_ORDERS_PATH, label: "Siparişlerim", icon: "receipt_long", requiresAuth: true },
  { href: MUSTERI_FAVORITES_PATH, label: "Favoriler", icon: "favorite", requiresAuth: true, center: true },
  { href: MUSTERI_ADDRESSES_PATH, label: "Adreslerim", icon: "location_on", requiresAuth: true },
  { href: MUSTERI_ACCOUNT_PATH, label: "Hesabım", icon: "person", requiresAuth: true },
];

export function isMusteriAppPath(pathname: string): boolean {
  return pathname === MUSTERI_HOME_PATH || pathname.startsWith(`${MUSTERI_HOME_PATH}/`);
}

export function isMusteriAuthPath(pathname: string): boolean {
  return (
    pathname === MUSTERI_LOGIN_PATH ||
    pathname.startsWith(`${MUSTERI_LOGIN_PATH}/`) ||
    pathname === MUSTERI_REGISTER_PATH ||
    pathname.startsWith(`${MUSTERI_REGISTER_PATH}/`)
  );
}

export function isMusteriNextPath(nextPath: string): boolean {
  const pathname = nextPath.split("?")[0] || "";
  return isMusteriAppPath(pathname) || isMusteriAuthPath(pathname);
}

export function musteriLoginWithNext(nextPath: string): string {
  const next = nextPath.startsWith("/") ? nextPath : MUSTERI_HOME_PATH;
  return `${MUSTERI_LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

export function tabActive(pathname: string, href: string): boolean {
  if (href === MUSTERI_HOME_PATH) return pathname === MUSTERI_HOME_PATH;
  return pathname === href || pathname.startsWith(`${href}/`);
}
