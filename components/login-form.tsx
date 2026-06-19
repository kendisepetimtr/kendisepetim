"use client";

import Link from "next/link";
import { useId, useActionState } from "react";
import { loginAction, type LoginActionState } from "@/app/giris/actions";

type Props = {
  nextPath: string;
  notice?: "email-verified" | "signup-ok" | "password-updated" | null;
  /** Sunucuda zaten Supabase oturumu var (ör. e-posta onayı sonrası) */
  signedIn?: boolean;
};

const NOTICE_COPY: Record<NonNullable<Props["notice"]>, { title: string; body: string }> = {
  "email-verified": {
    title: "E-postanız doğrulandı",
    body: "Gmail veya kullandığınız adres üzerinden onay tamam. Oturumunuz açıksa «Panele git» ile devam edin; değilse e-posta ve şifrenizle giriş yapın.",
  },
  "signup-ok": {
    title: "Kayıt başarılı",
    body: "Hesabınız hazır. E-posta doğrulaması gerekiyorsa önce gelen kutunuzu (ör. Gmail) kontrol edin; ardından buradan giriş yapın.",
  },
  "password-updated": {
    title: "Şifreniz güncellendi",
    body: "Yeni şifreniz kaydedildi. Aşağıdan e-posta ve yeni şifrenizle giriş yapabilirsiniz.",
  },
};

export default function LoginForm({ nextPath, notice = null, signedIn = false }: Props) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(loginAction, null as LoginActionState);
  const noticeText = notice ? NOTICE_COPY[notice] : null;

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Giriş yap
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Yönetim panelinize e-posta ve şifrenizle erişin.
        </p>
      </div>

      {noticeText ? (
        <div
          className="mb-6 rounded-xl border border-emerald-600/25 bg-emerald-600/8 px-4 py-3 text-left text-sm text-on-background"
          role="status"
        >
          <p className="font-semibold text-emerald-900">{noticeText.title}</p>
          <p className="mt-1 text-secondary">{noticeText.body}</p>
        </div>
      ) : null}

      {signedIn ? (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-center text-sm">
          <p className="font-medium text-on-background">Oturumunuz açık.</p>
          <Link
            href={nextPath}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95"
          >
            Panele git
          </Link>
        </div>
      ) : (
        <form
          action={formAction}
          className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
          noValidate
        >
          <input type="hidden" name="next" value={nextPath} />

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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${formId}-pass`} className="block text-sm font-semibold text-on-background">
                Şifre
              </label>
              <Link
                href="/sifremi-unuttum"
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Şifremi unuttum
              </Link>
            </div>
            <input
              id={`${formId}-pass`}
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
            className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 enabled:active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      )}

      {!signedIn ? (
        <p className="mt-8 text-center text-sm text-secondary">
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-primary underline-offset-2 hover:underline">
            Ücretsiz kayıt olun
          </Link>
        </p>
      ) : null}
    </>
  );
}
