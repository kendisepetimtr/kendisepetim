import MusteriAccount from "@/components/musteri/musteri-account";
import { getCustomerProfileByUserId } from "@/lib/musteri/customer-profile";
import { loadMusteriSession } from "@/lib/musteri/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesabım",
};

export default async function MusteriAccountPage() {
  const session = await loadMusteriSession();
  const isCustomer = session.kind === "customer";
  const profile =
    isCustomer && session.userId ? await getCustomerProfileByUserId(session.userId) : null;

  return (
    <MusteriAccount
      isCustomer={isCustomer}
      email={session.email}
      firstName={profile?.firstName ?? session.firstName}
      lastName={profile?.lastName ?? ""}
      phone={profile?.phone ?? ""}
    />
  );
}
