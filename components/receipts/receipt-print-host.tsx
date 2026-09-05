"use client";

import { RECEIPT_PREVIEW_EVENT, printReceiptHtml, type ReceiptPreviewDetail } from "@/lib/receipt-print";
import { useEffect, useState } from "react";

export default function ReceiptPrintHost() {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const [heading, setHeading] = useState("Fiş");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    function onPreview(event: Event) {
      const detail = (event as CustomEvent<ReceiptPreviewDetail>).detail;
      if (!detail?.html) return;
      setHtml(detail.html);
      setHeading(detail.heading?.trim() || "Fiş");
      setOpen(true);
    }
    window.addEventListener(RECEIPT_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(RECEIPT_PREVIEW_EVENT, onPreview);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ks-receipt-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-surface-container-highest bg-background shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
          <div>
            <h2 id="ks-receipt-title" className="font-headline text-lg font-extrabold">
              Fiş
            </h2>
            <p className="text-xs font-semibold text-secondary">{heading}</p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-secondary hover:bg-surface-container-low"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-low/60 p-3">
          <iframe
            title="Fiş önizleme"
            srcDoc={html}
            className="mx-auto block h-[70vh] w-full max-w-[22rem] rounded-xl bg-white shadow-inner"
          />
        </div>
        <div className="flex gap-2 border-t border-surface-container-highest p-4">
          <button
            type="button"
            className="flex-1 rounded-xl border border-surface-container-highest py-3 text-sm font-bold"
            onClick={() => setOpen(false)}
          >
            Kapat
          </button>
          <button
            type="button"
            disabled={printing}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-60"
            onClick={() => {
              setPrinting(true);
              void printReceiptHtml(html).finally(() => setPrinting(false));
            }}
          >
            {printing ? "Yazdırılıyor…" : "Yazdır"}
          </button>
        </div>
      </div>
    </div>
  );
}
