/** Tarayıcıda ve sunucuda site kök URL'si (sonunda / yok). */
export function getPublicSiteUrl(fallbackOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "";
}
