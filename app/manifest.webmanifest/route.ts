import { isMarketplacePwaHost } from "@/lib/pwa-host";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const host = request.headers.get("host");
  if (!isMarketplacePwaHost(host)) {
    return Response.json({ name: "KendiSepetim" }, { status: 404 });
  }

  const manifest = {
    id: "https://www.kendisepetim.com/",
    name: "KendiSepetim",
    short_name: "KendiSepetim",
    description: "Yakınınızdaki mutfak, kendi sepetiniz. Restoran keşfet, sipariş ver.",
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f6",
    theme_color: "#bc000c",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
