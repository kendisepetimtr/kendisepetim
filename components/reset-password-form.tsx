"use client";

import Link from "next/link";
import { useId, useActionState } from "react";
import { resetPasswordAction, type ResetPasswordActionState } from "@/app/sifre-yenile/actions";

type Props = {
  hasSession: boolean;
};

export default function ResetPasswordForm({ hasSession }: Props) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(resetPasswordAction, null as ResetPasswordActionState);

  if (!hasSession) {
    return (
      <div
        className="rounded-2xl border border-outline-variant/60 bg-surface-container-low px-6 py-8 text-center text-sm shadow-sm"
        role="alert"
      >
        <p className="font-headline text-lg font-bold text-on-background">Bağlantı geçersiz veya süresi dolmuş</p>
        <p className="mt-3 leading-relaxed text-secondary">
          Yeni şifre belirlemek için e-postanızdaki sıfırlama bağlantısını açın. Bağlantı çalışmıyorsa yeni bir
          tane isteyin.
        </p>
        <Link
          href="/sifremi-unuttum"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95"
        >
          Yeni bağlantı iste
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Yeni şifre belirle
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Hesabınız için yeni bir şifre girin. Kaydettikten sonra bu şifreyle giriş yapabilirsiniz.
        </p>
      </div>

      <form
        action={formAction}
        className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor={`${formId}-password`} className="block text-sm font-semibold text-on-background">
            Yeni şifre
          </label>
          <input
            id={`${formId}-password`}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="En az 8 karakter"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${formId}-password-again`} className="block text-sm font-semibold text-on-background">
            Yeni şifre tekrar
          </label>
          <input
            id={`${formId}-password-again`}
            name="passwordAgain"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
          className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 enabled:active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Şifreyi kaydet"}
        </button>
      </form>
    </>
  );
}
