"use client";

import { useActionState, useId } from "react";
import { verifyCashierPinAction, type CashierPinActionState } from "@/app/kasa/actions";

type Props = {
  slug: string;
  nextPath: string;
  pinConfigured: boolean;
  businessName: string;
};

export default function CashierPinForm({ slug, nextPath, pinConfigured, businessName }: Props) {
  const baseId = useId();
  const [state, formAction, pending] = useActionState(verifyCashierPinAction, null as CashierPinActionState);

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="next" value={nextPath} />

      <div className="rounded-xl border border-surface-container-high bg-surface-container-low/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">İşletme</p>
        <p className="mt-1 font-headline text-lg font-bold text-on-background">{businessName}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${baseId}-pin`} className="block text-sm font-semibold text-on-background">
          4 haneli kasa PIN
        </label>
        <input
          id={`${baseId}-pin`}
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={4}
          disabled={!pinConfigured || pending}
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-container-low"
          placeholder="0000"
        />
      </div>

      {!pinConfigured ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-on-background">
          Kasa PIN henüz tanımlanmadı. İşletme sahibi Dashboard → Ayarlar → Operasyon bölümünden PIN
          belirlemelidir.
        </p>
      ) : null}

      {state?.error ? (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!pinConfigured || pending}
        className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 enabled:active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Doğrulanıyor…" : "Kasa paneline geç"}
      </button>
    </form>
  );
}
