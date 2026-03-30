"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import type { MenuFabTheme, MenuFabTriggerMode } from "@/lib/menu-layout";
import { BrandMark } from "./brand-mark";

export type { MenuFabTheme, MenuFabTriggerMode } from "@/lib/menu-layout";

type ActionKey = "konum" | "ara" | "whatsapp" | "sepet";

const ACTIONS: { key: ActionKey; label: string; Icon: () => ReactElement }[] = [
  {
    key: "konum",
    label: "Konum",
    Icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    ),
  },
  {
    key: "ara",
    label: "Ara",
    Icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.77.57 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.14a2 2 0 0 1 2.11-.45c.84.26 1.71.45 2.61.57A2 2 0 0 1 22 16.92Z" />
      </svg>
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    Icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    key: "sepet",
    label: "Sepet",
    Icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
        <path d="M3 3h2l.4 2M7 13h10l3-7H5.4M7 13 5.4 5M7 13l-1.5 6h11" />
      </svg>
    ),
  },
];

function TriggerFace({
  theme,
  mode,
  open,
  logoUrl,
}: {
  theme: MenuFabTheme;
  mode: MenuFabTriggerMode;
  open: boolean;
  logoUrl?: string | null;
}) {
  if (mode === "logo") {
    return (
      <span className={`inline-block ${open ? "scale-95" : "scale-100"} transition-transform duration-200`} aria-hidden>
        <BrandMark theme={theme} size="fab" logoUrl={logoUrl} />
      </span>
    );
  }

  const shell =
    "flex h-14 w-14 items-center justify-center shadow-lg transition-transform duration-200 focus:outline-none";
  const icon =
    mode === "plus" ? (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
    ) : (
      <span className="flex flex-col gap-1.5" aria-hidden>
        <span className="block h-0.5 w-5 rounded-full bg-current" />
        <span className="block h-0.5 w-5 rounded-full bg-current" />
        <span className="block h-0.5 w-5 rounded-full bg-current" />
      </span>
    );

  switch (theme) {
    case "m1":
      return (
        <span className={`${shell} rounded-full border border-gray-200 bg-white text-gray-800`}>{icon}</span>
      );
    case "m3":
      return (
        <span className={`${shell} rounded-full border-2 border-amber-500/50 bg-stone-800 text-amber-100`}>{icon}</span>
      );
    case "m5":
      return <span className={`${shell} bg-gray-900 text-white`}>{icon}</span>;
    case "m6":
      return <span className={`${shell} rounded-full bg-blue-600 text-white`}>{icon}</span>;
    case "m7":
      return (
        <span className={`${shell} rounded-lg border border-gray-200 bg-white text-gray-900`}>{icon}</span>
      );
    case "m8":
      return (
        <span className={`${shell} rounded-full border-2 border-amber-800/25 bg-amber-50 text-amber-900`}>{icon}</span>
      );
    default:
      return null;
  }
}

function actionButtonClass(theme: MenuFabTheme, actionKey: string): string {
  const base =
    "flex h-12 w-12 shrink-0 origin-bottom-right items-center justify-center border shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  const shape = theme === "m7" ? "rounded-lg" : "rounded-full";

  // Aksiyon renkleri sabit: tema rengine göre değişmez.
  const tone =
    actionKey === "konum"
      ? "border-sky-300 bg-sky-500 text-white hover:bg-sky-600 focus-visible:ring-sky-400"
      : actionKey === "ara"
        ? "border-indigo-300 bg-indigo-500 text-white hover:bg-indigo-600 focus-visible:ring-indigo-400"
        : actionKey === "whatsapp"
          ? "border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-400"
          : actionKey === "sepet"
            ? "border-amber-300 bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400"
            : "border-gray-300 bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-400";

  return `${base} ${shape} ${tone}`;
}

function triggerWrapperClass(theme: MenuFabTheme, open: boolean): string {
  const ring = "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  switch (theme) {
    case "m1":
      return `${ring} rounded-full focus-visible:ring-gray-400 ${open ? "ring-2 ring-gray-300 ring-offset-2" : ""}`;
    case "m3":
      return `${ring} rounded-full focus-visible:ring-amber-500 ${open ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-stone-900" : ""}`;
    case "m5":
      return `${ring} focus-visible:ring-gray-600 ${open ? "ring-2 ring-gray-700 ring-offset-2" : ""}`;
    case "m6":
      return `${ring} rounded-full focus-visible:ring-blue-500 ${open ? "ring-2 ring-blue-500/30 ring-offset-2" : ""}`;
    case "m7":
      return `${ring} rounded-lg focus-visible:ring-gray-400 ${open ? "ring-2 ring-gray-200 ring-offset-2" : ""}`;
    case "m8":
      return `${ring} rounded-full focus-visible:ring-amber-600 ${open ? "ring-2 ring-amber-700/30 ring-offset-2" : ""}`;
    default:
      return ring;
  }
}

function actionMotionFan(theme: MenuFabTheme, open: boolean, index: number): string {
  if (theme === "m6") {
    // Fan Classic (Soft): açıkta hizalı, geçişte sağ-sol yelpaze.
    const spread = [
      "translate-x-16 -translate-y-1 -rotate-10",
      "-translate-x-16 -translate-y-1 rotate-10",
      "translate-x-20 translate-y-0 -rotate-8",
      "-translate-x-20 translate-y-0 rotate-8",
    ];
    const from = spread[index % spread.length] ?? "translate-x-12 translate-y-0";
    const on = open
      ? "pointer-events-auto -translate-x-2 translate-y-0 scale-100 rotate-0 opacity-100"
      : `pointer-events-none ${from} scale-75 opacity-0`;
    return `transform-gpu transition-all duration-[360ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${on}`;
  }

  // Sağlı-sollu yelpaze: butonlar açılırken farklı x/y ofsetlerinden merkeze gelir.
  const spread = [
    "translate-x-10 -translate-y-1 -rotate-12",
    "-translate-x-10 -translate-y-2 rotate-12",
    "translate-x-12 translate-y-0 -rotate-8",
    "-translate-x-12 translate-y-1 rotate-8",
  ];
  const from = spread[index % spread.length] ?? "translate-x-8 translate-y-1";
  const on = open
    ? "pointer-events-auto translate-x-0 translate-y-0 scale-100 rotate-0 opacity-100"
    : `pointer-events-none ${from} scale-75 opacity-0`;
  return `transform-gpu transition-all duration-[380ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${on}`;
}

function staggerDelayMs(theme: MenuFabTheme, open: boolean, index: number, count: number): number {
  if (theme === "m6") {
    return open ? (count - 1 - index) * 50 : index * 40;
  }
  if (!open) return 0;
  const order = count - 1 - index;
  return order * 48;
}

type MenuFabProps = {
  theme: MenuFabTheme;
  trigger?: MenuFabTriggerMode;
  cartHref?: string | null;
  logoUrl?: string | null;
  fabCallEnabled?: boolean;
  fabCallPhone?: string | null;
  fabWhatsappEnabled?: boolean;
  fabWhatsappPhone?: string | null;
  fabLocationEnabled?: boolean;
  fabLocationLat?: number | null;
  fabLocationLng?: number | null;
  /** Uzun sayfada FAB her zaman görünür kalsın (canlı menü tam ekran) */
  fixedToViewport?: boolean;
  cartCount?: number;
};

export function MenuPreviewFab({
  theme,
  trigger = "logo",
  cartHref,
  logoUrl,
  fabCallEnabled = false,
  fabCallPhone,
  fabWhatsappEnabled = false,
  fabWhatsappPhone,
  fabLocationEnabled = false,
  fabLocationLat,
  fabLocationLng,
  fixedToViewport = false,
  cartCount = 0,
}: MenuFabProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const layer = fixedToViewport ? "fixed" : "absolute";
  const zBackdrop = fixedToViewport ? "z-[100]" : "z-30";
  const zCluster = fixedToViewport ? "z-[110]" : "z-40";
  const callHref = fabCallPhone ? `tel:${fabCallPhone}` : null;
  const whatsappDigits = (fabWhatsappPhone ?? "").replace(/[^\d]/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;
  const locationHref =
    fabLocationLat != null && fabLocationLng != null
      ? `https://www.google.com/maps?q=${fabLocationLat},${fabLocationLng}`
      : null;

  const visibleActions = ACTIONS.filter((a) => {
    if (a.key === "sepet") return Boolean(cartHref);
    if (a.key === "ara") return fabCallEnabled && Boolean(callHref);
    if (a.key === "whatsapp") return fabWhatsappEnabled && Boolean(whatsappHref);
    if (a.key === "konum") return fabLocationEnabled && Boolean(locationHref);
    return false;
  });

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className={`pointer-events-none ${layer} inset-0 ${zBackdrop}`}>
      {open && (
        <button
          type="button"
          className={`pointer-events-auto ${layer} inset-0 ${zBackdrop} cursor-default bg-black/15 transition-colors`}
          aria-label="Menüyü kapat"
          onClick={close}
        />
      )}
      <div className={`pointer-events-none ${layer} bottom-4 right-4 ${zCluster} flex flex-col items-end gap-3`}>
        <div
          id={panelId}
          role="group"
          aria-label="Hızlı işlemler"
          className="flex flex-col items-end gap-3"
        >
          {visibleActions.map((a, i) => {
            const href =
              a.key === "sepet"
                ? cartHref
                : a.key === "ara"
                  ? callHref
                  : a.key === "whatsapp"
                    ? whatsappHref
                    : locationHref;
            const isLink = Boolean(href);
            const isCart = a.key === "sepet";
            const showCartBadge = isCart && open && cartCount > 0;
            const inner = (
              <>
                <span className="sr-only">{a.label}</span>
                <a.Icon />
                {showCartBadge ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </>
            );
            return isLink ? (
              <a
                key={a.key}
                href={href ?? "#"}
                title={a.label}
                aria-label={a.label}
                target={a.key === "ara" || a.key === "sepet" ? undefined : "_blank"}
                rel={a.key === "ara" || a.key === "sepet" ? undefined : "noopener noreferrer"}
                onClick={(e) => e.stopPropagation()}
                style={{ transitionDelay: `${staggerDelayMs(theme, open, i, visibleActions.length)}ms` }}
                className={`relative pointer-events-auto ${actionMotionFan(
                  theme,
                  open,
                  i,
                )} ${actionButtonClass(theme, a.key)} hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
              >
                {inner}
              </a>
            ) : (
              <button
                key={a.key}
                type="button"
                title={a.label}
                aria-label={a.label}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                style={{ transitionDelay: `${staggerDelayMs(theme, open, i, visibleActions.length)}ms` }}
                className={`relative pointer-events-auto ${actionMotionFan(
                  theme,
                  open,
                  i,
                )} ${actionButtonClass(theme, a.key)} hover:-translate-y-0.5 active:translate-y-0 active:scale-95`}
              >
                {inner}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`relative pointer-events-auto ${triggerWrapperClass(theme, open)} transition-transform duration-300 ease-out ${
            open ? "scale-95" : "scale-100"
          }`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
        >
          <TriggerFace theme={theme} mode={trigger} open={open} logoUrl={logoUrl} />
          {!open && cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
