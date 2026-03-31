"use client";

import Link from "next/link";

type ComposerSavedModalProps = {
  message: string;
  closeHref: string;
  continueHref: string;
};

export function ComposerSavedModal({ message, closeHref, continueHref }: ComposerSavedModalProps) {
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/40 p-4">
      <Link href={closeHref} className="absolute inset-0" aria-label="Kapat" />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-emerald-200 bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-emerald-900">Başarılı</h3>
        <p className="mt-1 text-sm text-gray-700">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Link href={closeHref} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Kapat
          </Link>
          <Link href={continueHref} className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">
            Devam et
          </Link>
        </div>
      </div>
    </div>
  );
}
