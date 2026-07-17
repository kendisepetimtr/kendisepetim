"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { superadminLogoutAction } from "@/app/superadmin/actions";
import type { ReactNode } from "react";

const NAV = [
  { href: "/superadmin", label: "Genel bakış", icon: "dashboard" },
  { href: "/superadmin/isletmeler", label: "İşletmeler", icon: "storefront" },
  { href: "/superadmin/muhasebe", label: "Muhasebe", icon: "account_balance" },
  { href: "/superadmin/hesap", label: "Hesap", icon: "manage_accounts" },
] as const;

type SuperadminShellProps = {
  children: ReactNode;
};

export default function SuperadminShell({ children }: SuperadminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-container-low lg:flex">
      <aside className="border-b border-surface-container-highest bg-surface-container-lowest lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">KendiSepetim</p>
            <p className="font-headline text-lg font-extrabold tracking-tight text-on-background">Süperadmin</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0">
          {NAV.map((item) => {
            const active =
              item.href === "/superadmin"
                ? pathname === "/superadmin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-secondary hover:bg-surface-container-low hover:text-on-background",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-surface-container-highest p-4 lg:block">
          <form action={superadminLogoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl border border-surface-container-highest px-3 py-2.5 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Çıkış
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="flex items-center justify-between border-b border-surface-container-highest bg-surface-container-lowest/90 px-4 py-3 backdrop-blur lg:hidden">
          <p className="font-headline text-base font-bold">Süperadmin</p>
          <form action={superadminLogoutAction}>
            <button type="submit" className="text-sm font-semibold text-primary">
              Çıkış
            </button>
          </form>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
