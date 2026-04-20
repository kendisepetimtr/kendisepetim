/** Material SymbolsOutlined adı — panel Bağlantılar ikonları */
export type PublicMenuConnectionLink = {
  key: string;
  href: string;
  label: string;
  hint?: string;
  icon: string;
};

/**
 * Panelden gösterilecek müşteri menüsü adresleri (geliştirme + üretim).
 */
export function getPublicMenuConnectionLinks(subdomain: string): PublicMenuConnectionLink[] {
  const prod = `https://${subdomain}.kendisepetim.com`;
  const links: PublicMenuConnectionLink[] = [
    {
      key: "live-menu-prod",
      href: prod,
      label: `${subdomain}.kendisepetim.com`,
      hint: "Canlı menü (üretim)",
      icon: "rocket_launch",
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
