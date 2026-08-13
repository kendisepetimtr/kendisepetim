import MusteriExplore from "@/components/musteri/musteri-explore";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sipariş ver",
  description: "Antalya Muratpaşa restoranlarından yemek sipariş edin.",
};

export default async function MusteriHomePage() {
  const listings = await fetchMarketplaceListings();
  return <MusteriExplore initialListings={listings} />;
}
