import MusteriOrders from "@/components/musteri/musteri-orders";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import { loadCustomerOrders } from "@/lib/musteri/orders-service";
import { loadMusteriSession } from "@/lib/musteri/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Siparişlerim",
};

export default async function MusteriOrdersPage() {
  const session = await loadMusteriSession();
  const isCustomer = session.kind === "customer";
  const [accountOrders, listings] = await Promise.all([
    isCustomer && session.userId ? loadCustomerOrders(session.userId) : Promise.resolve([]),
    fetchMarketplaceListings(),
  ]);
  const restaurantNames: Record<string, string> = {};
  for (const l of listings) restaurantNames[l.subdomain] = l.businessName;

  return (
    <MusteriOrders
      accountOrders={accountOrders}
      isCustomer={isCustomer}
      restaurantNames={restaurantNames}
    />
  );
}
