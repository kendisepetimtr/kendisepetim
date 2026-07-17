"use client";

import Link from "next/link";
import { useId, useActionState } from "react";
import { clearLoginSessionAction } from "@/app/dashboard/actions";
import { loginAction, type LoginActionState } from "@/app/giris/actions";
import GoogleAuthButton from "@/components/google-auth-button";
import { humanizeOAuthError } from "@/lib/oauth-errors";

type Props = {
  nextPath: string;
  supabaseConfigured?: boolean;
  notice?: "email-verified" | "signup-ok" | "password-updated" | null;
  oauthError?: string | null;
  /** Sunucuda zaten Supabase oturumu var — formu yine göster, otomatik panele gitme */
  signedIn?: boolean;
  signedInEmail?: string | null;
};

const NOTICE_COPY: Record<NonNullable<Props["notice"]>, { title: string; body: string }> = {
  "email-verified": {
    title: "E-postanız doğrulandı",
    body: "Gmail veya kullandığınız adres üzerinden onay tamam. Aşağıdan e-posta ve şifrenizle giriş yapın.",
  },
  "signup-ok": {
    title: "Kayıt başarılı",
    body: "Hesabınız hazır. E-posta doğrulaması gerekiyorsa önce gelen kutunuzu kontrol edin; ardından buradan giriş yapın.",
  },
  "password-updated": {
    title: "Şifreniz güncellendi",
    body: "Yeni şifreniz kaydedildi. Aşağıdan e-posta ve yeni şifrenizle giriş yapabilirsiniz.",
  },
};

export default function LoginForm({
  nextPath,
  supabaseConfigured = false,
  notice = null,
  oauthError = null,
  signedIn = false,
  signedInEmail = null,
}: Props) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(loginAction, null as LoginActionState);
  const noticeText = notice ? NOTICE_COPY[notice] : null;

  if (!supabaseConfigured) {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
            Giriş yap
          </h1>
        </div>
        <div
          className="rounded-2xl border border-outline-variant/60 bg-surface-container-low px-6 py-8 text-center text-sm shadow-sm"
          role="alert"
        >
          <p className="font-headline text-lg font-bold text-on-background">Giriş servisi yapılandırılmamış</p>
          <p className="mt-3 leading-relaxed text-secondary">
            E-posta, şifre ve Google girişi için Supabase ortam değişkenleri tanımlı olmalı.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Giriş yap
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Google ile veya e-posta ve şifrenizle yönetim panelinize erişin.
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

      {oauthError ? (
        <p
          className="mb-6 whitespace-pre-line rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {humanizeOAuthError(oauthError)}
        </p>
      ) : null}

      {signedIn ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-on-background">
          <p className="font-semibold">
            Bu tarayıcıda açık bir oturum var
            {signedInEmail ? (
              <>
                : <span className="font-mono text-xs">{signedInEmail}</span>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-secondary">
            Farklı bir hesapla giriş yapmak için önce çıkış yapın. Aynı hesaba devam etmek için panele
            gidebilirsiniz.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={nextPath.startsWith("/") ? nextPath : "/dashboard"}
              className="inline-flex rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-bold text-on-background hover:bg-surface-container-low"
            >
              Panele git
            </Link>
            <form action={clearLoginSessionAction}>
              <button
                type="submit"
                className="inline-flex rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-container"
              >
                Farklı hesapla giriş
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mb-6">
        <GoogleAuthButton nextPath={nextPath} label="Google ile giriş yap" />
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-surface-container-highest" />
          </div>
          <p className="relative mx-auto w-fit bg-background px-3 text-xs font-medium uppercase tracking-wide text-secondary">
            veya e-posta ile
          </p>
        </div>
      </div>

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

      <p className="mt-8 text-center text-sm text-secondary">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-primary underline-offset-2 hover:underline">
          Ücretsiz kayıt olun
        </Link>
      </p>
    </>
  );
}
