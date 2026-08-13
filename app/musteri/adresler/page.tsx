import MusteriAddresses from "@/components/musteri/musteri-addresses";
import { loadCustomerAddresses } from "@/lib/musteri/customer-profile";
import { loadMusteriSession } from "@/lib/musteri/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adreslerim",
};

export default async function MusteriAddressesPage() {
  const session = await loadMusteriSession();
  const isCustomer = session.kind === "customer";
  const initialAddresses =
    isCustomer && session.userId ? await loadCustomerAddresses(session.userId) : [];

  return <MusteriAddresses isCustomer={isCustomer} initialAddresses={initialAddresses} />;
}
