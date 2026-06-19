"use client";

import Link from "next/link";
import { useId, useActionState } from "react";
import { forgotPasswordAction, type ForgotPasswordActionState } from "@/app/sifremi-unuttum/actions";

export default function ForgotPasswordForm() {
  const formId = useId();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null as ForgotPasswordActionState);

  if (state && "success" in state) {
    return (
      <div
        className="rounded-2xl border border-emerald-600/25 bg-emerald-600/8 px-6 py-8 text-center text-sm shadow-sm"
        role="status"
      >
        <p className="font-headline text-lg font-bold text-emerald-900">E-posta gönderildi</p>
        <p className="mt-3 leading-relaxed text-secondary">
          Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gelen kutunuza iletildi. Bağlantıya
          tıkladıktan sonra yeni şifrenizi belirleyebilirsiniz.
        </p>
        <Link
          href="/giris"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Şifremi unuttum
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Kayıtlı e-posta adresinizi girin; size şifre sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      <form
        action={formAction}
        className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor={`${formId}-email`} className="block text-sm font-semibold text-on-background">
            E-posta
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="siz@isletme.com"
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
          {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-secondary">
        Şifrenizi hatırladınız mı?{" "}
        <Link href="/giris" className="font-semibold text-primary underline-offset-2 hover:underline">
          Giriş yap
        </Link>
      </p>
    </>
  );
}
