import SiteHome from "@/components/landing/site-home";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import { loadCurrentPlatformVersionLabel } from "@/lib/superadmin/todos-service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restoranlar için",
  description:
    "QR menü, kasa ve garson paneli. Restoranınızı KendiSepetim’de dijitalleştirin.",
};

export default async function IsletmePage() {
  const [listings, platformVersion] = await Promise.all([
    fetchMarketplaceListings(),
    loadCurrentPlatformVersionLabel(),
  ]);

  return <SiteHome listings={listings} platformVersion={platformVersion} />;
}
