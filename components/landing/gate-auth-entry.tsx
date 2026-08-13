"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";

export default function GateAuthEntry() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-full border border-surface-container-highest bg-surface-container-lowest px-4 py-1.5 text-xs font-bold text-on-background shadow-sm transition hover:border-primary/30 hover:text-primary sm:px-5 sm:text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Giriş
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#1a1a1c]/55 backdrop-blur-sm"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[1] w-full max-w-[360px] overflow-hidden rounded-[1.75rem] bg-background shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:max-w-[400px]"
          >
            <div className="relative bg-gradient-to-br from-[#bc000c] to-[#e71418] px-5 pb-8 pt-5 text-white sm:px-6 sm:pb-9 sm:pt-6">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                aria-label="Kapat"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">KendiSepetim</p>
              <p id={titleId} className="mt-2 font-headline text-2xl font-extrabold tracking-tight sm:text-[1.65rem]">
                Giriş yap
              </p>
              <p className="mt-1.5 max-w-[16rem] text-sm leading-snug text-white/85">
                Hesap türünü seçin — müşteri ve restoran oturumları ayrıdır.
              </p>
            </div>

            <div className="-mt-4 space-y-2.5 px-4 pb-5 sm:px-5 sm:pb-6">
              <Link
                href={MUSTERI_LOGIN_PATH}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 rounded-2xl border border-surface-container-highest bg-surface-container-lowest px-3.5 py-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md active:scale-[0.99] sm:px-4 sm:py-4"
              >
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#bc000c] to-[#e71418] text-white shadow-md shadow-primary/25">
                  <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-bold text-on-background">Müşteri Girişi</span>
                  <span className="mt-0.5 block text-xs text-secondary">Yemek siparişi vermek için</span>
                </span>
                <span className="material-symbols-outlined text-[22px] text-secondary transition group-hover:translate-x-0.5 group-hover:text-primary">
                  arrow_forward
                </span>
              </Link>

              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 rounded-2xl border border-surface-container-highest bg-surface-container-lowest px-3.5 py-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md active:scale-[0.99] sm:px-4 sm:py-4"
              >
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-on-background text-white shadow-md shadow-black/15">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-bold text-on-background">Restoran Girişi</span>
                  <span className="mt-0.5 block text-xs text-secondary">İşletme panelini yönetmek için</span>
                </span>
                <span className="material-symbols-outlined text-[22px] text-secondary transition group-hover:translate-x-0.5 group-hover:text-primary">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
