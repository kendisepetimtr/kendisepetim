"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { superadminLogoutAction } from "@/app/superadmin/actions";
import { type ReactNode, useEffect, useState } from "react";

const NAV = [
  { href: "/superadmin", label: "Genel bakış", icon: "dashboard", short: "Özet" },
  { href: "/superadmin/isletmeler", label: "İşletmeler", icon: "storefront", short: "İşletme" },
  { href: "/superadmin/muhasebe", label: "Muhasebe", icon: "account_balance", short: "Muhasebe" },
  { href: "/superadmin/yapilacaklar", label: "Yapılacaklar", icon: "checklist", short: "Yapılacak" },
  { href: "/superadmin/hesap", label: "Hesap", icon: "manage_accounts", short: "Hesap" },
] as const;

type SuperadminShellProps = {
  children: ReactNode;
};

export default function SuperadminShell({ children }: SuperadminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function isActive(href: string) {
    return href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-surface-container-low lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-surface-container-highest lg:bg-surface-container-lowest">
        <div className="flex items-center gap-3 px-5 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">KendiSepetim</p>
            <p className="font-headline text-lg font-extrabold tracking-tight text-on-background">
              Süperadmin
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive(item.href)
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-secondary hover:bg-surface-container-low hover:text-on-background",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-surface-container-highest p-4">
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

      {/* Mobil üst bar */}
      <div className="sticky top-0 z-30 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">KendiSepetim</p>
            <p className="font-headline text-base font-extrabold tracking-tight">Süperadmin</p>
          </div>
          <div className="flex items-center gap-2">
            <form action={superadminLogoutAction}>
              <button
                type="submit"
                className="rounded-xl px-2.5 py-2 text-xs font-semibold text-primary sm:text-sm"
              >
                Çıkış
              </button>
            </form>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface-container-highest text-on-background"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            >
              <span className="material-symbols-outlined text-[22px]">
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-surface-container-highest px-3 py-3 sm:px-4">
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold",
                    isActive(item.href)
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-on-background",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0 lg:pl-64">
        <main className="flex-1">{children}</main>
      </div>

      {/* Mobil alt sekme çubuğu */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 pb-[env(safe-area-inset-bottom)] pt-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold",
                isActive(item.href) ? "text-primary" : "text-secondary",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              {item.short}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
