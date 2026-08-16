import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPartnerHost } from "@/lib/partner/host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  if (isPartnerHost(host)) {
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: ["/superadmin", "/dashboard", "/api/"] }],
      host: "partner.kendisepetim.com",
      sitemap: "https://partner.kendisepetim.com/sitemap.xml",
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/superadmin", "/dashboard", "/admin", "/garson", "/kasa", "/api/", "/giris", "/kayit"],
      },
    ],
    host: "www.kendisepetim.com",
    sitemap: "https://www.kendisepetim.com/sitemap.xml",
  };
}
