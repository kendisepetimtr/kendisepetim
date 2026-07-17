/**
 * Personel oturum cookie — garson (kişi PIN) ve kasa.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { StaffPinRole } from "@/lib/staff/pin";

export const WAITER_SESSION_COOKIE = "ks_staff_waiter";
export const CASHIER_SESSION_COOKIE = "ks_staff_cashier";

/** Tek aktif garson: uzun oturum */
export const WAITER_SESSION_MAX_AGE_SINGLE_SEC = 12 * 60 * 60;
/** Birden fazla aktif garson: yarım saat */
export const WAITER_SESSION_MAX_AGE_MULTI_SEC = 30 * 60;
export const CASHIER_SESSION_MAX_AGE_SEC = 12 * 60 * 60;

export type StaffSessionPayload = {
  exp: number;
  tenantId: string;
  role: StaffPinRole;
  pinSetAt: string;
  rnd: string;
  /** Garson kişi oturumu */
  waiterId?: string;
  staffLabel?: string;
};

function getSecret(): string | null {
  const secret =
    process.env.STAFF_SESSION_SECRET?.trim() || process.env.OWNER_ADMIN_SESSION_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function encodePayload(payload: StaffSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): StaffSessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<StaffSessionPayload>;
    if (
      typeof parsed.exp !== "number" ||
      typeof parsed.tenantId !== "string" ||
      (parsed.role !== "waiter" && parsed.role !== "cashier" && parsed.role !== "admin") ||
      typeof parsed.pinSetAt !== "string" ||
      typeof parsed.rnd !== "string"
    ) {
      return null;
    }
    return {
      exp: parsed.exp,
      tenantId: parsed.tenantId,
      role: parsed.role,
      pinSetAt: parsed.pinSetAt,
      rnd: parsed.rnd,
      waiterId: typeof parsed.waiterId === "string" ? parsed.waiterId : undefined,
      staffLabel: typeof parsed.staffLabel === "string" ? parsed.staffLabel : undefined,
    };
  } catch {
    return null;
  }
}

export function mintStaffSessionToken(input: {
  tenantId: string;
  role: StaffPinRole;
  pinSetAt: string;
  maxAgeSec?: number;
  waiterId?: string;
  staffLabel?: string;
}): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const maxAgeSec =
    input.maxAgeSec ??
    (input.role === "waiter" ? WAITER_SESSION_MAX_AGE_SINGLE_SEC : CASHIER_SESSION_MAX_AGE_SEC);

  const payload: StaffSessionPayload = {
    exp: Date.now() + maxAgeSec * 1000,
    tenantId: input.tenantId,
    role: input.role,
    pinSetAt: input.pinSetAt,
    rnd: randomBytes(12).toString("hex"),
    waiterId: input.waiterId,
    staffLabel: input.staffLabel,
  };
  const encoded = encodePayload(payload);
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffSessionPayload | null {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;

  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedHex = createHmac("sha256", secret).update(encoded).digest("hex");
  if (sig.length !== expectedHex.length) return null;

  try {
    const valid = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedHex, "hex"));
    if (!valid) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload || Date.now() > payload.exp) return null;
  return payload;
}

export function waiterSessionCookieOptions(maxAgeSec = WAITER_SESSION_MAX_AGE_SINGLE_SEC) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function cashierSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CASHIER_SESSION_MAX_AGE_SEC,
  };
}

export function legacyStaffCookieClearOptions(legacyPath: "/kasa" | "/garson") {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: legacyPath,
    maxAge: 0,
  };
}
