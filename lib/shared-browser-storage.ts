/**
 * Apex + restoran alt alanları arasında paylaşılan tarayıcı deposu.
 * Canlıda Domain=.kendisepetim.com çerezi; her zaman localStorage yedek.
 * Cookie ~3.5KB sınırı aşılırsa yalnızca localStorage yazılır (aynı host’ta çalışır).
 */

const COOKIE_MAX_CHARS = 3500;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Üretim: .kendisepetim.com — localhost alt alanlarında tarayıcı Domain=.localhost’u güvenilir paylaşmaz. */
export function sharedCookieDomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (host === "kendisepetim.com" || host.endsWith(".kendisepetim.com")) {
    return ".kendisepetim.com";
  }
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return null;
}

function writeCookie(name: string, value: string | null, maxAgeSec = 60 * 60 * 24 * 30): void {
  if (typeof document === "undefined") return;
  const domain = sharedCookieDomain();
  const base = `${encodeURIComponent(name)}=`;
  if (value == null || value === "") {
    const clear = `${base}; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = domain ? `${clear}; Domain=${domain}` : clear;
    if (window.location.protocol === "https:") {
      document.cookie = domain
        ? `${clear}; Domain=${domain}; Secure`
        : `${clear}; Secure`;
    }
    return;
  }
  const encoded = encodeURIComponent(value);
  if (encoded.length > COOKIE_MAX_CHARS) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const body = `${base}${encoded}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
  document.cookie = domain ? `${body}; Domain=${domain}` : body;
}

type Envelope = { v: unknown; t: number };

function parseEnvelope(raw: string | null): Envelope | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p) || !("v" in p) || typeof p.t !== "number") {
      // Eski düz JSON (zarfsız) — t=0 ile localStorage güncellemesine izin ver
      return { v: p, t: 0 };
    }
    return { v: p.v, t: p.t };
  } catch {
    return null;
  }
}

/** Cookie ve localStorage’dan daha yeni olanı döner; ikisini hizalar. */
export function readSharedJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  let lsRaw: string | null = null;
  try {
    lsRaw = window.localStorage.getItem(key);
  } catch {
    lsRaw = null;
  }
  const cookieRaw = readCookie(key);
  const fromLs = parseEnvelope(lsRaw);
  const fromCookie = parseEnvelope(cookieRaw);

  let winner: Envelope | null = null;
  if (fromLs && fromCookie) {
    winner = fromCookie.t >= fromLs.t ? fromCookie : fromLs;
  } else {
    winner = fromCookie ?? fromLs;
  }
  if (!winner) return null;

  // Hizala: kaybeden tarafı güncelle
  const packed = JSON.stringify({ v: winner.v, t: winner.t || Date.now() });
  try {
    if (lsRaw !== packed) window.localStorage.setItem(key, packed);
  } catch {
    /* quota */
  }
  if (cookieRaw !== packed && encodeURIComponent(packed).length <= COOKIE_MAX_CHARS) {
    writeCookie(key, packed);
  }

  return winner.v as T;
}

export function writeSharedJson(key: string, value: unknown | null): void {
  if (typeof window === "undefined") return;
  if (value == null) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    writeCookie(key, null);
    return;
  }
  const packed = JSON.stringify({ v: value, t: Date.now() });
  try {
    window.localStorage.setItem(key, packed);
  } catch {
    /* ignore */
  }
  writeCookie(key, packed);
}
