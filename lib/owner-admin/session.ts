import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OWNER_ADMIN_COOKIE = "ks_owner_admin";

const MAX_AGE_SEC = 12 * 60 * 60;

export type OwnerAdminSessionPayload = {
  exp: number;
  tenantId: string;
  userId: string;
  pinSetAt: string;
  rnd: string;
};

function getSecret(): string | null {
  const secret = process.env.OWNER_ADMIN_SESSION_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function encodePayload(payload: OwnerAdminSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): OwnerAdminSessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OwnerAdminSessionPayload>;
    if (
      typeof parsed.exp !== "number" ||
      typeof parsed.tenantId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.pinSetAt !== "string" ||
      typeof parsed.rnd !== "string"
    ) {
      return null;
    }
    return {
      exp: parsed.exp,
      tenantId: parsed.tenantId,
      userId: parsed.userId,
      pinSetAt: parsed.pinSetAt,
      rnd: parsed.rnd,
    };
  } catch {
    return null;
  }
}

export function mintOwnerAdminToken(input: {
  tenantId: string;
  userId: string;
  pinSetAt: string;
}): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: OwnerAdminSessionPayload = {
    exp: Date.now() + MAX_AGE_SEC * 1000,
    tenantId: input.tenantId,
    userId: input.userId,
    pinSetAt: input.pinSetAt,
    rnd: randomBytes(12).toString("hex"),
  };
  const encoded = encodePayload(payload);
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifyOwnerAdminToken(token: string | undefined | null): OwnerAdminSessionPayload | null {
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

export function ownerAdminCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    maxAge: MAX_AGE_SEC,
  };
}
