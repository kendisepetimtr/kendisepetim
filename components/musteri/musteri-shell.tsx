"use client";

import Link from "next/link";
import SiteLogo from "@/components/site-logo";
import CustomerChrome, { CustomerIdentityChip } from "@/components/musteri/customer-chrome";
import CustomerNotificationsPanel from "@/components/musteri/customer-notifications-panel";
import GuestFavoritesMigrator from "@/components/musteri/guest-favorites-migrator";
import PartnerInviteBanner from "@/components/musteri/partner-invite-banner";
import type { MusteriSession } from "@/lib/musteri/session";
import { MUSTERI_LOGIN_PATH, MUSTERI_REGISTER_PATH } from "@/lib/musteri/paths";

type Props = {
  session: MusteriSession;
  children: React.ReactNode;
};

export default function MusteriShell({ session, children }: Props) {
  const chromeSession = {
    kind: session.kind,
    firstName: session.firstName,
    lastName: session.lastName,
    email: session.email,
  };

  return (
    <CustomerChrome session={chromeSession} variant="shell">
      <GuestFavoritesMigrator enabled={session.kind === "customer"} />
      <PartnerInviteBanner />
      <header className="sticky top-0 z-40 border-b border-surface-container-highest/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:max-w-6xl sm:px-6">
          <SiteLogo variant="header" />
          <div className="flex items-center gap-3">
            <CustomerIdentityChip session={chromeSession} />
            <CustomerNotificationsPanel enabled={session.kind === "customer"} />
          </div>
        </div>
      </header>

      {session.kind === "restaurant" ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="mx-auto max-w-3xl text-on-background sm:max-w-6xl">
            Restoran hesabınız açık. Yemek siparişi için{" "}
            <Link href={MUSTERI_LOGIN_PATH} className="font-bold text-primary underline-offset-2 hover:underline">
              müşteri girişi
            </Link>{" "}
            veya{" "}
            <Link href={MUSTERI_REGISTER_PATH} className="font-bold text-primary underline-offset-2 hover:underline">
              ayrı müşteri hesabı
            </Link>{" "}
            kullanın. Bu ekranda misafir gibi devam edebilirsiniz.
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:max-w-6xl sm:px-6 lg:pb-10">
        {children}
      </main>
    </CustomerChrome>
  );
}
