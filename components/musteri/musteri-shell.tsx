"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteLogo from "@/components/site-logo";
import type { MusteriSession } from "@/lib/musteri/session";
import {
  MUSTERI_ACCOUNT_PATH,
  MUSTERI_ADDRESSES_PATH,
  MUSTERI_HOME_PATH,
  MUSTERI_LOGIN_PATH,
  MUSTERI_ORDERS_PATH,
  MUSTERI_REGISTER_PATH,
} from "@/lib/musteri/paths";

const TABS = [
  { href: MUSTERI_HOME_PATH, label: "Keşfet", icon: "restaurant" },
  { href: MUSTERI_ORDERS_PATH, label: "Siparişlerim", icon: "receipt_long" },
  { href: MUSTERI_ADDRESSES_PATH, label: "Adreslerim", icon: "location_on" },
  { href: MUSTERI_ACCOUNT_PATH, label: "Hesabım", icon: "person" },
] as const;

type Props = {
  session: MusteriSession;
  children: React.ReactNode;
};

function tabActive(pathname: string, href: string) {
  if (href === MUSTERI_HOME_PATH) return pathname === MUSTERI_HOME_PATH;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MusteriShell({ session, children }: Props) {
  const pathname = usePathname() ?? MUSTERI_HOME_PATH;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-surface-container-highest/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:max-w-6xl sm:px-6">
          <SiteLogo variant="compact" />
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.map((tab) => {
              const active = tabActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-bold transition",
                    active ? "bg-primary/10 text-primary" : "text-secondary hover:text-on-background",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 sm:max-w-6xl sm:px-6 md:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-surface-container-highest bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Müşteri menü"
      >
        <div className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = tabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold",
                  active ? "text-primary" : "text-secondary",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
