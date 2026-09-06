"use client";

import { ORDER_CANCEL_REASONS, ORDER_CANCEL_REASON_LABELS, type OrderCancelReason } from "@/lib/order-cancel";
import { useState } from "react";

type Props = {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (reason: OrderCancelReason, note: string) => void;
};

export default function CancelOrderDialog({ open, pending = false, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState<OrderCancelReason>("out_of_stock");
  const [note, setNote] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-on-background/50" aria-label="Kapat" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-2xl sm:rounded-2xl">
        <h2 className="font-headline text-lg font-bold">Siparişi iptal et</h2>
        <p className="mt-1 text-xs text-secondary">Neden müşteri takip ekranında görünür.</p>
        <div className="mt-4 space-y-2">
          {ORDER_CANCEL_REASONS.map((id) => (
            <label key={id} className="flex items-center gap-2 rounded-xl border border-surface-container-highest px-3 py-2 text-sm">
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === id}
                onChange={() => setReason(id)}
              />
              {ORDER_CANCEL_REASON_LABELS[id]}
            </label>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          placeholder="Not (isteğe bağlı)"
          className="mt-3 w-full rounded-xl border border-surface-container-highest px-3 py-2 text-sm"
          rows={3}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(reason, note.trim())}
            className="flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            İptal et
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
