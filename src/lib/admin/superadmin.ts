export const SUPERADMIN_SESSION_COOKIE = "superadmin_session";

const DEFAULT_SUPERADMIN_EMAIL = "kendisepetimtr@gmail.com";
const DEFAULT_SUPERADMIN_PASSWORD = "0101";

export function getSuperadminEmail(): string {
  return (process.env.SUPERADMIN_LOGIN_EMAIL ?? DEFAULT_SUPERADMIN_EMAIL).trim().toLowerCase();
}

export function getSuperadminPassword(): string {
  return (process.env.SUPERADMIN_LOGIN_PASSWORD ?? DEFAULT_SUPERADMIN_PASSWORD).trim();
}

export function validateSuperadminLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === getSuperadminEmail() &&
    password.trim() === getSuperadminPassword()
  );
}

export function isSuperadminSession(value: string | undefined): boolean {
  return value === "ok";
}
