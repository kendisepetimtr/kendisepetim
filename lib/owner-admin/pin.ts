import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PIN_REGEX = /^\d{4}$/;

export function isValidOwnerAdminPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export function hashOwnerAdminPin(pin: string): string {
  if (!isValidOwnerAdminPin(pin)) {
    throw new Error("PIN tam olarak 4 haneli olmalıdır.");
  }

  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, 32).toString("hex");
  return `s1$${salt}$${derived}`;
}

export function verifyOwnerAdminPin(pin: string, storedHash: string | null | undefined): boolean {
  if (!isValidOwnerAdminPin(pin) || !storedHash) return false;

  const [scheme, salt, expectedHex] = storedHash.split("$");
  if (scheme !== "s1" || !salt || !expectedHex) return false;

  try {
    const actual = Buffer.from(scryptSync(pin, salt, 32).toString("hex"), "utf8");
    const expected = Buffer.from(expectedHex, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
