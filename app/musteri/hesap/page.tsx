import MusteriAccount from "@/components/musteri/musteri-account";
import { getCustomerProfileByUserId } from "@/lib/musteri/customer-profile";
import { requireMusteriCustomer } from "@/lib/musteri/require-customer";
import { MUSTERI_ACCOUNT_PATH } from "@/lib/musteri/paths";
import { loadMusteriSession } from "@/lib/musteri/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesabım",
};

export default async function MusteriAccountPage() {
  const userId = await requireMusteriCustomer(MUSTERI_ACCOUNT_PATH);
  const session = await loadMusteriSession();
  const profile = await getCustomerProfileByUserId(userId);

  return (
    <MusteriAccount
      isCustomer
      email={session.email}
      firstName={profile?.firstName ?? session.firstName}
      lastName={profile?.lastName ?? ""}
      phone={profile?.phone ?? ""}
    />
  );
}
