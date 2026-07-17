import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,64}$/;

export function isValidSuperadminUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

export function isValidSuperadminPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/** scrypt hash — format: s1$salt$hex */
export function hashSuperadminPassword(password: string): string {
  if (!isValidSuperadminPassword(password)) {
    throw new Error("Şifre 8–128 karakter olmalıdır.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `s1$${salt}$${derived}`;
}

export function verifySuperadminPassword(
  password: string,
  storedHash: string | null | undefined,
): boolean {
  if (!password || !storedHash) return false;
  const [scheme, salt, expectedHex] = storedHash.split("$");
  if (scheme !== "s1" || !salt || !expectedHex) return false;
  try {
    const actual = Buffer.from(scryptSync(password, salt, 32).toString("hex"), "utf8");
    const expected = Buffer.from(expectedHex, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
