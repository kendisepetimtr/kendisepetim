/** Dış müşteri (sipariş veren) paneli ve auth yolları. */

export const MUSTERI_HOME_PATH = "/musteri";
export const MUSTERI_ORDERS_PATH = "/musteri/siparisler";
export const MUSTERI_ADDRESSES_PATH = "/musteri/adresler";
export const MUSTERI_ACCOUNT_PATH = "/musteri/hesap";
export const MUSTERI_LOGIN_PATH = "/musteri/giris";
export const MUSTERI_REGISTER_PATH = "/musteri/kayit";

export const ISLETME_HOME_PATH = "/isletme";

export const CUSTOMER_EMAIL_VERIFIED_LOGIN_PATH = `${MUSTERI_LOGIN_PATH}?verified=1`;

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
  return isMusteriAppPath(nextPath) || isMusteriAuthPath(nextPath);
}
