import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url";

/** Material SymbolsOutlined adı — panel Bağlantılar ikonları */
export type PublicMenuConnectionLink = {
  key: string;
  href: string;
  label: string;
  hint?: string;
  icon: string;
};

/** Resmi canlı menü adresi — restoranadiniz.kendisepetim.com */
export function getPublicMenuSubdomainUrl(subdomain: string): string {
  return `https://${subdomain}.kendisepetim.com`;
}

/** QR ve paylaşımda kullanılan birincil menü URL'si. */
export function getPrimaryPublicMenuUrl(subdomain: string): string {
  return getPublicMenuSubdomainUrl(subdomain);
}

/** Yedek path menüsü — resmi subdomain açılmazsa veya platform içi linkler için. */
export function getPublicMenuPathUrl(
  subdomain: string,
  origin: string = PRODUCTION_SITE_ORIGIN,
): string {
  return `${origin.replace(/\/$/, "")}/m/${encodeURIComponent(subdomain)}`;
}

/**
 * Panelden gösterilecek müşteri menüsü adresleri (geliştirme + üretim).
 * İlk kayıt her zaman resmi subdomain adresidir.
 */
export function getPublicMenuConnectionLinks(subdomain: string): PublicMenuConnectionLink[] {
  const prodSubdomain = getPublicMenuSubdomainUrl(subdomain);
  const prodPath = getPublicMenuPathUrl(subdomain);
  const links: PublicMenuConnectionLink[] = [
    {
      key: "live-menu-prod",
      href: prodSubdomain,
      label: `${subdomain}.kendisepetim.com`,
      hint: "Resmi menü adresi",
      icon: "rocket_launch",
    },
    {
      key: "live-menu-path-prod",
      href: prodPath,
      label: `kendisepetim.com/m/${subdomain}`,
      hint: "Yedek menü (path)",
      icon: "link",
    },
  ];

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const hostPort = port && port !== "80" && port !== "443" ? `:${port}` : "";
    const origin = `${protocol}//${hostname}${hostPort}`;
    const pathUrl = `${origin}/m/${encodeURIComponent(subdomain)}`;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      links.push({
        key: "live-menu-path",
        href: pathUrl,
        label: `/m/${subdomain}`,
        hint: "Yerel önizleme (path)",
        icon: "preview",
      });
      links.push({
        key: "live-menu-subdomain",
        href: `http://${subdomain}.localhost${hostPort}`,
        label: `${subdomain}.localhost${hostPort}`,
        hint: "Alt alan adı simülasyonu",
        icon: "dns",
      });
    }
  }

  return links;
}
