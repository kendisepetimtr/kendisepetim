import RestoranlarClient from "@/components/marketplace/restoranlar-client";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restoranlar",
  description: "Antalya Muratpaşa bölgesindeki restoranların menüsüne göz atın ve sipariş verin.",
};

export default async function RestoranlarPage() {
  const listings = await fetchMarketplaceListings();
  return <RestoranlarClient initialListings={listings} />;
}
