"use client";

import { useActionState } from "react";
import { superadminLoginAction, type SuperadminLoginState } from "@/app/superadmin/actions";

export default function SuperadminLoginForm() {
  const [state, formAction, pending] = useActionState(superadminLoginAction, null as SuperadminLoginState);

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
    >
      <div className="space-y-2">
        <label htmlFor="sa-password" className="block text-sm font-semibold text-on-background">
          Şifre
        </label>
        <input
          id="sa-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="••••••••"
        />
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Giriş…" : "Giriş"}
      </button>
    </form>
  );
}
