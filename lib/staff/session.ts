import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { StaffPinRole } from "@/lib/staff/pin";



export const WAITER_SESSION_COOKIE = "ks_staff_waiter";
export const CASHIER_SESSION_COOKIE = "ks_staff_cashier";



const MAX_AGE_SEC = 12 * 60 * 60;



export type StaffSessionPayload = {

  exp: number;

  tenantId: string;

  role: StaffPinRole;

  pinSetAt: string;

  rnd: string;

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

    };

  } catch {

    return null;

  }

}



export function mintStaffSessionToken(input: {

  tenantId: string;

  role: StaffPinRole;

  pinSetAt: string;

}): string | null {

  const secret = getSecret();

  if (!secret) return null;



  const payload: StaffSessionPayload = {

    exp: Date.now() + MAX_AGE_SEC * 1000,

    tenantId: input.tenantId,

    role: input.role,

    pinSetAt: input.pinSetAt,

    rnd: randomBytes(12).toString("hex"),

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



export function waiterSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    /** /api/garson/* isteklerinde cookie gitsin diye kök path */
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function cashierSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    /** /api/kasa/* isteklerinde cookie gitsin diye kök path */
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

/** Eski Path=/kasa ve Path=/garson cookie'lerini sil (API'ye gitmiyordu). */
export function legacyStaffCookieClearOptions(legacyPath: "/kasa" | "/garson") {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: legacyPath,
    maxAge: 0,
  };
}


