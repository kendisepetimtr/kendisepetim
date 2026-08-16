import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPartnerHost } from "@/lib/partner/host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host");
  if (isPartnerHost(host)) {
    return [
      {
        url: "https://partner.kendisepetim.com",
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: "https://partner.kendisepetim.com/kayit",
        changeFrequency: "weekly",
        priority: 0.9,
      },
      {
        url: "https://partner.kendisepetim.com/giris",
        changeFrequency: "monthly",
        priority: 0.6,
      },
    ];
  }

  return [
    {
      url: "https://www.kendisepetim.com",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://www.kendisepetim.com/musteri/giris",
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
