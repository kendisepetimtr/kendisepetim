"use client";

import { useRouter } from "next/navigation";

export function PrintReceiptActions() {
  const router = useRouter();

  return (
    <div className="mb-4 flex items-center justify-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Geri
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Yazdır
      </button>
    </div>
  );
}
