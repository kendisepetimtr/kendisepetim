import MusteriOrders from "@/components/musteri/musteri-orders";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import { loadCustomerOrders } from "@/lib/musteri/orders-service";
import { requireMusteriCustomer } from "@/lib/musteri/require-customer";
import { MUSTERI_ORDERS_PATH } from "@/lib/musteri/paths";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Siparişlerim",
};

export default async function MusteriOrdersPage() {
  const userId = await requireMusteriCustomer(MUSTERI_ORDERS_PATH);
  const [accountOrders, listings] = await Promise.all([
    loadCustomerOrders(userId),
    fetchMarketplaceListings(),
  ]);
  const restaurantNames: Record<string, string> = {};
  for (const l of listings) restaurantNames[l.subdomain] = l.businessName;

  return (
    <MusteriOrders
      accountOrders={accountOrders}
      isCustomer
      restaurantNames={restaurantNames}
    />
  );
}
