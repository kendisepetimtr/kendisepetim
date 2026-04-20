import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SUPERADMIN_COOKIE = "ks_superadmin";

const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function getSecret(): string | null {
  const s = process.env.SUPERADMIN_SESSION_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function mintSuperadminToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const rnd = randomBytes(16).toString("hex");
  const payload = `${exp}.${rnd}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySuperadminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, rnd, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${expStr}.${rnd}`;
  const expectedHex = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

export function superadminCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
