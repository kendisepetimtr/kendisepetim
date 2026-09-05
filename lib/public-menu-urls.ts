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

/** Marketplace sepetinden sipariş onayına (checkout) dönen menü adresi. */
export function getPublicMenuCheckoutUrl(subdomain: string): string {
  const slug = subdomain.toLowerCase();
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const hostPort = port && port !== "80" && port !== "443" ? `:${port}` : "";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}${hostPort}/m/${encodeURIComponent(slug)}?sepet=1`;
    }
    const tenantHost = `${slug}.`;
    if (hostname === `${slug}.kendisepetim.com` || hostname.startsWith(tenantHost)) {
      return `${protocol}//${hostname}${hostPort}/?sepet=1`;
    }
  }
  return `${getPrimaryPublicMenuUrl(slug)}?sepet=1`;
}

/** Yedek path menüsü — resmi subdomain açılmazsa veya platform içi linkler için. */
export function getPublicMenuPathUrl(
  subdomain: string,
  origin: string = PRODUCTION_SITE_ORIGIN,
): string {
  return `${origin.replace(/\/$/, "")}/m/${encodeURIComponent(subdomain)}`;
}

/** Masa menusu URL — slug.kendisepetim.com/masa/5 */
export function getTableMenuUrl(
  subdomain: string,
  tableNumber: number,
  siteOrigin?: string,
): string {
  const path = `/masa/${tableNumber}`;
  if (siteOrigin) {
    try {
      const origin = new URL(siteOrigin);
      if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
        const port = origin.port && origin.port !== "80" && origin.port !== "443" ? `:${origin.port}` : "";
        return `${origin.protocol}//${subdomain}.localhost${port}${path}`;
      }
    } catch {
      /* fall through */
    }
  }
  return `https://${subdomain}.kendisepetim.com${path}`;
}

/** Path fallback — kendisepetim.com/m/slug/masa/N */
export function getTableMenuPathUrl(
  subdomain: string,
  tableNumber: number,
  origin: string = PRODUCTION_SITE_ORIGIN,
): string {
  return `${origin.replace(/\/$/, "")}/m/${encodeURIComponent(subdomain)}/masa/${tableNumber}`;
}

export function getTenantPanelQuickLinks(subdomain: string): PublicMenuConnectionLink[] {
  return [
    {
      key: "panel-garson",
      href: "/garson",
      label: "Garson",
      hint: "Garson paneli",
      icon: "room_service",
    },
    {
      key: "panel-kasa",
      href: "/kasa",
      label: "Kasa",
      hint: "Kasa modu",
      icon: "point_of_sale",
    },
    {
      key: "panel-admin",
      href: "/admin",
      label: "Admin",
      hint: "Patron görünümü",
      icon: "admin_panel_settings",
    },
  ];
}

/** Panel sidebar: canli menu + personel panelleri. */
export function getDashboardQuickLinks(subdomain: string): PublicMenuConnectionLink[] {
  const menuLinks = getPublicMenuConnectionLinks(subdomain);
  const primaryMenu = menuLinks.find((l) => l.key === "live-menu-prod") ?? menuLinks[0];
  const menuPreview =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? menuLinks.find((l) => l.key === "live-menu-subdomain")
      : null;

  return [
    ...(primaryMenu ? [primaryMenu] : []),
    ...(menuPreview ? [menuPreview] : []),
    ...getTenantPanelQuickLinks(subdomain),
  ];
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
