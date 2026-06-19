/** Ortam degiskeninden site kok URL (sonunda / yok). */
export function getEnvSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
}

/**
 * Tarayicida o an acik olan domain — OAuth redirect icin env yerine bunu kullanin.
 * Boylece canlida localhost env olsa bile dogru adrese donulur.
 */
export function getBrowserSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return getEnvSiteUrl();
}

/** Sunucu action / route: istek host'u, yoksa env. */
export async function getRequestSiteUrl(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim();
  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = isLocal
      ? "http"
      : (h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return getEnvSiteUrl();
}

/** @deprecated Tarayicida getBrowserSiteUrl kullanin. */
export function getPublicSiteUrl(fallbackOrigin?: string): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv = getEnvSiteUrl();
  if (fromEnv) return fromEnv;
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "";
}
