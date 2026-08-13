"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MUSTERI_LOGIN_PATH,
  MUSTERI_NAV_TABS,
  MUSTERI_REGISTER_PATH,
  musteriLoginWithNext,
  tabActive,
  type MusteriNavTab,
} from "@/lib/musteri/paths";
import { getOAuthSiteBase } from "@/lib/site-url";

export type CustomerChromeSession = {
  kind: "guest" | "customer" | "restaurant" | "unknown";
  firstName: string;
  email: string | null;
};

type Props = {
  session: CustomerChromeSession;
  /** Menü subdomain'inde absolute apex linkleri */
  absoluteLinks?: boolean;
  /** Masaüstü sol sidebar + mobil alt bar */
  variant?: "shell" | "overlay";
  children?: React.ReactNode;
  /** Header chip satırı (menü sayfası) */
  showIdentityChip?: boolean;
  className?: string;
};

function resolveHref(href: string, absolute: boolean): string {
  if (!absolute) return href;
  return `${getOAuthSiteBase()}${href}`;
}

function NavLink({
  tab,
  pathname,
  isCustomer,
  absolute,
  layout,
}: {
  tab: MusteriNavTab;
  pathname: string;
  isCustomer: boolean;
  absolute: boolean;
  layout: "bottom" | "side";
}) {
  const active = tabActive(pathname, tab.href);
  const needsGate = tab.requiresAuth && !isCustomer;
  const href = needsGate
    ? resolveHref(musteriLoginWithNext(tab.href), absolute)
    : resolveHref(tab.href, absolute);

  if (layout === "bottom") {
    return (
      <Link
        href={href}
        className={[
          "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold sm:text-[11px]",
          tab.center ? "-mt-3" : "",
          active ? "text-primary" : "text-secondary",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex items-center justify-center",
            tab.center
              ? "size-12 rounded-full bg-gradient-to-br from-[#bc000c] to-[#e71418] text-white shadow-lg shadow-primary/30"
              : "",
          ].join(" ")}
        >
          <span
            className={["material-symbols-outlined", tab.center ? "text-[26px]" : "text-[22px]"].join(" ")}
            style={tab.center || (active && tab.icon === "favorite") ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {tab.icon}
          </span>
        </span>
        <span className={tab.center ? "mt-1 text-primary" : ""}>{tab.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
        active ? "bg-primary/10 text-primary" : "text-secondary hover:bg-surface-container-low hover:text-on-background",
      ].join(" ")}
    >
      <span
        className="material-symbols-outlined text-[22px]"
        style={active && tab.icon === "favorite" ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {tab.icon}
      </span>
      {tab.label}
      {needsGate ? <span className="ml-auto text-[10px] font-semibold text-secondary">Giriş</span> : null}
    </Link>
  );
}

export function CustomerIdentityChip({
  session,
  absolute = false,
}: {
  session: CustomerChromeSession;
  absolute?: boolean;
}) {
  const isCustomer = session.kind === "customer";
  const label = isCustomer
    ? session.firstName.trim() || session.email || "Müşteri"
    : session.kind === "restaurant"
      ? "Restoran oturumu"
      : "Misafir";

  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "inline-flex max-w-[9rem] truncate rounded-full px-2.5 py-1 text-[11px] font-bold",
          isCustomer ? "bg-primary/10 text-primary" : "bg-surface-container-high text-secondary",
        ].join(" ")}
      >
        {label}
      </span>
      {isCustomer ? (
        <a
          href={resolveHref("/musteri/hesap", absolute)}
          className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
        >
          Hesabım
        </a>
      ) : (
        <a
          href={resolveHref(MUSTERI_LOGIN_PATH, absolute)}
          className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
        >
          Giriş
        </a>
      )}
    </div>
  );
}

export default function CustomerChrome({
  session,
  absoluteLinks = false,
  variant = "shell",
  children,
  showIdentityChip = false,
  className,
}: Props) {
  const pathname = usePathname() ?? "/musteri";
  const isCustomer = session.kind === "customer";
  const absolute = absoluteLinks;

  const bottomNav = (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-surface-container-highest bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Müşteri menü"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {MUSTERI_NAV_TABS.map((tab) => (
          <NavLink
            key={tab.href}
            tab={tab}
            pathname={pathname}
            isCustomer={isCustomer}
            absolute={absolute}
            layout="bottom"
          />
        ))}
      </div>
    </nav>
  );

  const sideNav = (
    <aside className="hidden w-56 shrink-0 border-r border-surface-container-highest bg-surface-container-lowest/80 lg:flex lg:flex-col lg:py-6">
      <p className="mb-4 px-4 text-[11px] font-bold uppercase tracking-wider text-secondary">Müşteri</p>
      <nav className="flex flex-col gap-1 px-2" aria-label="Müşteri yan menü">
        {MUSTERI_NAV_TABS.map((tab) => (
          <NavLink
            key={tab.href}
            tab={tab}
            pathname={pathname}
            isCustomer={isCustomer}
            absolute={absolute}
            layout="side"
          />
        ))}
      </nav>
      {!isCustomer ? (
        <div className="mt-auto space-y-2 border-t border-surface-container-highest px-4 pt-4">
          <a
            href={resolveHref(MUSTERI_LOGIN_PATH, absolute)}
            className="block rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-bold text-white"
          >
            Giriş yap
          </a>
          <a
            href={resolveHref(MUSTERI_REGISTER_PATH, absolute)}
            className="block text-center text-xs font-bold text-primary"
          >
            Kayıt ol
          </a>
        </div>
      ) : null}
    </aside>
  );

  if (variant === "overlay") {
    return (
      <>
        {showIdentityChip ? (
          <div className="pointer-events-auto">
            <CustomerIdentityChip session={session} absolute={absolute} />
          </div>
        ) : null}
        {bottomNav}
        {/* Desktop: floating left rail on menu pages */}
        <div className="pointer-events-none fixed bottom-0 left-0 top-0 z-40 hidden lg:block">
          <div className="pointer-events-auto flex h-full">{sideNav}</div>
        </div>
      </>
    );
  }

  return (
    <div className={["flex min-h-screen bg-background", className].filter(Boolean).join(" ")}>
      {sideNav}
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        {bottomNav}
      </div>
    </div>
  );
}
