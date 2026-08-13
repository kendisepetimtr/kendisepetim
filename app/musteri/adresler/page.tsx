import MusteriAddresses from "@/components/musteri/musteri-addresses";
import { loadCustomerAddresses } from "@/lib/musteri/customer-profile";
import { requireMusteriCustomer } from "@/lib/musteri/require-customer";
import { MUSTERI_ADDRESSES_PATH } from "@/lib/musteri/paths";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adreslerim",
};

export default async function MusteriAddressesPage() {
  const userId = await requireMusteriCustomer(MUSTERI_ADDRESSES_PATH);
  const initialAddresses = await loadCustomerAddresses(userId);
  return <MusteriAddresses isCustomer initialAddresses={initialAddresses} />;
}
