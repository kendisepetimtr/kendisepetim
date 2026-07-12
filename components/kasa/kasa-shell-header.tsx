"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { signOutCashierAction } from "@/app/kasa/actions";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";

type TabId = "masalar" | "paket";

type KasaShellHeaderProps = {
  businessName: string;
  features: KasaFeatures;
  active: TabId;
  /** Sepet: yeni sipariş — yoksa aktif sekmeye göre varsayılan */
  newOrderHref?: string;
  onBasketClick?: () => void;
  children?: ReactNode;
};

export default function KasaShellHeader({
  businessName,
  features,
  active,
  newOrderHref,
  onBasketClick,
  children,
}: KasaShellHeaderProps) {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const showBoard = features.dineIn || features.pickup;
  const tabs = (
    [
      { id: "masalar" as const, href: "/kasa", label: "Masalar", enabled: showBoard },
      { id: "paket" as const, href: "/kasa/paket", label: "Paket", enabled: features.delivery },
    ] as const
  ).filter((t) => t.enabled);

  const showTabs = tabs.length > 1;
  const basketHref =
    newOrderHref ??
    (active === "paket" && features.delivery
      ? "/kasa/paket"
      : features.dineIn || features.pickup
        ? "/kasa"
        : "/kasa/paket");

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
          {onBasketClick ? (
            <button
              type="button"
              onClick={onBasketClick}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white shadow-md transition hover:brightness-105 active:scale-95"
              aria-label="Yeni sipariş al"
              title="Sipariş al"
            >
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_basket
              </span>
            </button>
          ) : (
            <Link
              href={basketHref}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white shadow-md transition hover:brightness-105 active:scale-95"
              aria-label="Yeni sipariş al"
              title="Sipariş al"
            >
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_basket
              </span>
            </Link>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label="Menü"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[22px]">more_vert</span>
            </button>
            {menuOpen ? (
              <div
                id={menuId}
                className="absolute right-0 z-30 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-surface-container-highest bg-white py-1 shadow-lg"
              >
                <form action={signOutCashierAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-background hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Çıkış
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showTabs ? (
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-3 sm:px-6">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                active === tab.id
                  ? "bg-primary text-white"
                  : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {children}
    </header>
  );
}
