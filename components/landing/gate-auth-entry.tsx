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
        className="whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface-container-low hover:text-on-background sm:text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Giriş
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-on-background/40 backdrop-blur-[2px]"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[1] w-full max-w-md rounded-t-[1.5rem] border border-surface-container-highest bg-background p-5 shadow-2xl sm:rounded-[1.5rem] sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p id={titleId} className="font-headline text-xl font-extrabold tracking-tight text-on-background">
                  Giriş
                </p>
                <p className="mt-1 text-sm text-secondary">Hangi hesapla devam etmek istiyorsunuz?</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-secondary transition hover:bg-surface-container-low hover:text-on-background"
                aria-label="Kapat"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={MUSTERI_LOGIN_PATH}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 rounded-2xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 transition hover:border-primary/35 hover:bg-primary/5"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">person</span>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-bold text-on-background">Müşteri Girişi</span>
                  <span className="mt-0.5 block text-xs text-secondary">Yemek siparişi için</span>
                </span>
                <span className="material-symbols-outlined text-[20px] text-secondary">chevron_right</span>
              </Link>

              <Link
                href="/giris"
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 rounded-2xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 transition hover:border-primary/35 hover:bg-primary/5"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-bold text-on-background">Restoran Girişi</span>
                  <span className="mt-0.5 block text-xs text-secondary">İşletme paneli için</span>
                </span>
                <span className="material-symbols-outlined text-[20px] text-secondary">chevron_right</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
