import KesfetClient from "@/components/marketplace/kesfet-client";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keşfet",
  description: "Antalya Muratpaşa bölgesinde restoran keşfedin ve sipariş verin.",
};

export default async function KesfetPage() {
  const listings = await fetchMarketplaceListings();
  return <KesfetClient initialListings={listings} />;
}
