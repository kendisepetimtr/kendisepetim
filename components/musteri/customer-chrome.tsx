"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import CustomerAuthModal from "@/components/musteri/customer-auth-modal";
import CustomerCartDrawer from "@/components/musteri/customer-cart-drawer";
import { customerInitials } from "@/lib/customer-initials";
import {
  getMarketplaceCart,
  marketplaceCartQty,
  subscribeMarketplaceCart,
} from "@/lib/marketplace-cart";
import {
  MUSTERI_ACCOUNT_PATH,
  MUSTERI_NAV_TABS,
  musteriLoginWithNext,
  tabActive,
  type MusteriNavTab,
} from "@/lib/musteri/paths";
import { getOAuthSiteBase } from "@/lib/site-url";
import { useMenuT } from "@/lib/use-menu-locale";

export type CustomerChromeSession = {
  kind: "guest" | "customer" | "restaurant" | "unknown";
  firstName: string;
  lastName?: string;
  email: string | null;
};

type Props = {
  session: CustomerChromeSession;
  absoluteLinks?: boolean;
  variant?: "shell" | "overlay";
  children?: React.ReactNode;
  showIdentityChip?: boolean;
  className?: string;
};

const CustomerUiContext = createContext<{
  openLogin: () => void;
  openRegister: () => void;
  openCart: () => void;
} | null>(null);

export function useCustomerUi() {
  return useContext(CustomerUiContext);
}

function resolveHref(href: string, absolute: boolean): string {
  if (!absolute) return href;
  return `${getOAuthSiteBase()}${href}`;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <span
      className={["material-symbols-outlined", filled ? "text-[#bc000c]" : "text-secondary"].join(" ")}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      favorite
    </span>
  );
}

function NavLink({
  tab,
  pathname,
  isCustomer,
  absolute,
  layout,
  cartQty,
  onCart,
}: {
  tab: MusteriNavTab;
  pathname: string;
  isCustomer: boolean;
  absolute: boolean;
  layout: "bottom" | "side";
  cartQty: number;
  onCart: () => void;
}) {
  const { t } = useMenuT();
  const label =
    tab.href === "#sepet"
      ? t("cart")
      : tab.href === "/" || tab.href === "/musteri"
        ? t("explore")
        : tab.href.includes("/siparisler")
          ? t("orders")
          : tab.href.includes("/favoriler")
            ? t("favorites")
            : tab.href.includes("/adresler")
              ? t("addresses")
              : tab.label;
  const isCart = tab.href === "#sepet";
  const active = tabActive(pathname, tab.href);
  const needsGate = tab.requiresAuth && !isCustomer;
  const href = needsGate
    ? resolveHref(musteriLoginWithNext(tab.href), absolute)
    : resolveHref(tab.href, absolute);

  if (isCart) {
    const inner = (
      <>
        <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-white ring-2 ring-primary/20">
          <Image src="/ks-logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          {cartQty > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-extrabold text-white">
              {cartQty}
            </span>
          ) : null}
        </span>
        <span className={layout === "bottom" ? "mt-1 text-primary" : ""}>{label}</span>
      </>
    );
    if (layout === "bottom") {
      return (
        <button type="button" onClick={onCart} className="-mt-3 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-primary sm:text-[11px]">
          {inner}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onCart}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-secondary hover:bg-surface-container-low hover:text-on-background"
      >
        <span className="relative inline-flex size-9 items-center justify-center">
          <Image src="/ks-logo.png" alt="" width={28} height={28} />
          {cartQty > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[9px] font-extrabold text-white">
              {cartQty}
            </span>
          ) : null}
        </span>
        {label}
      </button>
    );
  }

  if (layout === "bottom") {
    return (
      <Link
        href={href}
        className={[
          "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold sm:text-[11px]",
          active ? "text-primary" : "text-secondary",
        ].join(" ")}
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={active && tab.icon === "favorite" ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {tab.icon}
        </span>
        <span>{label}</span>
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
      {tab.icon === "favorite" ? (
        <HeartIcon filled={active} />
      ) : (
        <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
      )}
      {label}
      {needsGate ? <span className="ml-auto text-[10px] font-semibold text-secondary">{t("login")}</span> : null}
    </Link>
  );
}

export function CustomerIdentityChip({
  session,
  absolute = false,
  onLogin,
  onRegister,
}: {
  session: CustomerChromeSession;
  absolute?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
}) {
  const isCustomer = session.kind === "customer";
  const initials = customerInitials(session.firstName, session.lastName ?? "", session.email);
  const ui = useCustomerUi();
  const { t } = useMenuT();
  const login = onLogin ?? ui?.openLogin;
  const register = onRegister ?? ui?.openRegister;

  if (isCustomer) {
    return (
      <a
        href={resolveHref(MUSTERI_ACCOUNT_PATH, absolute)}
        className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white"
        title={t("account")}
      >
        {initials}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {login ? (
        <button
          type="button"
          onClick={login}
          className="rounded-full border border-surface-container-highest bg-white px-3 py-1.5 text-xs font-bold"
        >
          {t("login")}
        </button>
      ) : (
        <a href={resolveHref("/musteri/giris", absolute)} className="rounded-full border border-surface-container-highest bg-white px-3 py-1.5 text-xs font-bold">
          {t("login")}
        </a>
      )}
      {register ? (
        <button
          type="button"
          onClick={register}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          {t("register")}
        </button>
      ) : (
        <a href={resolveHref("/musteri/kayit", absolute)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
          {t("register")}
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
  const pathname = usePathname() ?? "/";
  const isCustomer = session.kind === "customer";
  const absolute = absoluteLinks;
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartQty, setCartQty] = useState(0);

  useEffect(() => {
    const read = () => setCartQty(marketplaceCartQty(getMarketplaceCart()));
    read();
    return subscribeMarketplaceCart(read);
  }, []);

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
            cartQty={cartQty}
            onCart={() => setCartOpen(true)}
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
            cartQty={cartQty}
            onCart={() => setCartOpen(true)}
          />
        ))}
      </nav>
    </aside>
  );

  const uiValue = useMemo(
    () => ({
      openLogin: () => setAuthMode("login"),
      openRegister: () => setAuthMode("register"),
      openCart: () => setCartOpen(true),
    }),
    [],
  );

  const extras = (
    <>
      <CustomerAuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />
      <CustomerCartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );

  if (variant === "overlay") {
    return (
      <CustomerUiContext.Provider value={uiValue}>
        {children}
        {showIdentityChip ? (
          <div className="pointer-events-auto">
            <CustomerIdentityChip session={session} absolute={absolute} />
          </div>
        ) : null}
        {bottomNav}
        <div className="pointer-events-none fixed bottom-0 left-0 top-0 z-40 hidden lg:block">
          <div className="pointer-events-auto flex h-full">{sideNav}</div>
        </div>
        {extras}
      </CustomerUiContext.Provider>
    );
  }

  return (
    <CustomerUiContext.Provider value={uiValue}>
      <div className={["flex min-h-screen bg-background", className].filter(Boolean).join(" ")}>
        {sideNav}
        <div className="flex min-w-0 flex-1 flex-col">
          {children}
          {bottomNav}
        </div>
        {extras}
      </div>
    </CustomerUiContext.Provider>
  );
}
