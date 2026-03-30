/**
 * Musteri menusu icin tam URL (subdomain) + yerelde /t/[slug] yedek yolu.
 */
export type PublicMenuUrls = {
  /** Yeni sekmede acilacak tam adres (subdomain) */
  primaryHref: string;
  /** Kullaniciya gosterilecek kisa metin (host) */
  primaryLabel: string;
  /** localhost'ta subdomain sorununda ayni origin */
  fallbackHref: string;
  fallbackLabel: string;
};

export function buildPublicMenuUrls(slug: string): PublicMenuUrls {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kendisepetim.com").trim().toLowerCase();
  const siteRaw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim() ?? "";

  const fallbackPath = `/t/${slug}`;
  let fallbackHref = fallbackPath;
  try {
    if (siteRaw) {
      fallbackHref = new URL(fallbackPath, siteRaw).toString();
    }
  } catch {
    fallbackHref = fallbackPath;
  }

  if (root === "localhost") {
    try {
      const base = siteRaw ? new URL(siteRaw) : new URL("http://localhost:3000");
      base.hostname = `${slug}.localhost`;
      const primaryHref = base.toString();
      const port = base.port ? `:${base.port}` : "";
      return {
        primaryHref,
        primaryLabel: `${slug}.localhost${port}`,
        fallbackHref,
        fallbackLabel: fallbackHref.replace(/^https?:\/\//, ""),
      };
    } catch {
      const primaryHref = `http://${slug}.localhost:3000`;
      return {
        primaryHref,
        primaryLabel: `${slug}.localhost:3000`,
        fallbackHref,
        fallbackLabel: fallbackHref.replace(/^https?:\/\//, ""),
      };
    }
  }

  const primaryHref = `https://${slug}.${root}`;
  return {
    primaryHref,
    primaryLabel: `${slug}.${root}`,
    fallbackHref,
    fallbackLabel: fallbackHref.replace(/^https?:\/\//, ""),
  };
}
