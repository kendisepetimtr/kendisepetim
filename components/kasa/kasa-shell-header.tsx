"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { signOutCashierAction } from "@/app/kasa/actions";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";

type KasaShellHeaderProps = {
  businessName: string;
  features: KasaFeatures;
  active: "masalar" | "gel-al";
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: ReactNode;
};

export default function KasaShellHeader({
  businessName,
  features,
  active,
  onRefresh,
  refreshing,
  children,
}: KasaShellHeaderProps) {
  const showTabs = features.dineIn && features.pickup;

  return (
    <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Kasa</p>
          <h1 className="truncate font-headline text-xl font-extrabold text-on-background sm:text-2xl">
            {businessName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {refreshing ? "…" : "Yenile"}
            </button>
          ) : null}
          <form action={signOutCashierAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Çıkış
            </button>
          </form>
        </div>
      </div>

      {showTabs ? (
        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-3 sm:px-6">
          <Link
            href="/kasa"
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              active === "masalar"
                ? "bg-primary text-white"
                : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
            ].join(" ")}
          >
            Masalar
          </Link>
          <Link
            href="/kasa/gel-al"
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              active === "gel-al"
                ? "bg-primary text-white"
                : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
            ].join(" ")}
          >
            Gel-Al
          </Link>
        </nav>
      ) : null}

      {children}
    </header>
  );
}
