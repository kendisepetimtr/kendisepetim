"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import GoogleAuthButton from "@/components/google-auth-button";
import { humanizeOAuthError } from "@/lib/oauth-errors";
import { MUSTERI_HOME_PATH, MUSTERI_REGISTER_PATH } from "@/lib/musteri/paths";
import {
  clearMusteriLoginSessionAction,
  musteriLoginAction,
  type MusteriAuthState,
} from "@/app/musteri/actions";

type Props = {
  supabaseConfigured: boolean;
  notice?: "email-verified" | "signup-ok" | "password-updated" | null;
  oauthError?: string | null;
  signedIn?: boolean;
  signedInEmail?: string | null;
  signedInKind?: "customer" | "restaurant" | "unknown" | "guest";
};

const NOTICE_COPY: Record<NonNullable<Props["notice"]>, { title: string; body: string }> = {
  "email-verified": {
    title: "E-postanız doğrulandı",
    body: "Aşağıdan e-posta ve şifrenizle müşteri girişi yapın.",
  },
  "signup-ok": {
    title: "Kayıt başarılı",
    body: "Hesabınız hazır. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.",
  },
  "password-updated": {
    title: "Şifreniz güncellendi",
    body: "Yeni şifrenizle giriş yapabilirsiniz.",
  },
};

export default function MusteriLoginForm({
  supabaseConfigured,
  notice = null,
  oauthError = null,
  signedIn = false,
  signedInEmail = null,
  signedInKind = "guest",
}: Props) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(musteriLoginAction, null as MusteriAuthState);
  const noticeText = notice ? NOTICE_COPY[notice] : null;

  if (!supabaseConfigured) {
    return (
      <p className="rounded-2xl border border-outline-variant/60 bg-surface-container-low px-6 py-8 text-center text-sm">
        Giriş servisi yapılandırılmamış.
      </p>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Müşteri</p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Giriş yap</h1>
        <p className="mt-3 text-sm text-secondary">
          Yemek siparişi hesabınız. Restoran paneli için ayrı giriş kullanın.
        </p>
      </div>

      {noticeText ? (
        <div className="mb-6 rounded-xl border border-emerald-600/25 bg-emerald-600/8 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-900">{noticeText.title}</p>
          <p className="mt-1 text-secondary">{noticeText.body}</p>
        </div>
      ) : null}

      {oauthError ? (
        <p className="mb-6 whitespace-pre-line rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {humanizeOAuthError(oauthError)}
        </p>
      ) : null}

      {signedIn ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-semibold">
            Bu tarayıcıda açık bir oturum var
            {signedInEmail ? (
              <>
                : <span className="font-mono text-xs">{signedInEmail}</span>
              </>
            ) : null}
          </p>
          {signedInKind === "restaurant" ? (
            <p className="mt-1 text-secondary">
              Bu bir restoran hesabı. Müşteri girişi için önce çıkış yapıp ayrı e-posta ile devam edin.
            </p>
          ) : signedInKind === "customer" ? (
            <p className="mt-1 text-secondary">Müşteri hesabınızla devam edebilirsiniz.</p>
          ) : (
            <p className="mt-1 text-secondary">Farklı hesap için önce çıkış yapın.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {signedInKind === "customer" ? (
              <Link
                href={MUSTERI_HOME_PATH}
                className="inline-flex rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-bold"
              >
                Siparişe git
              </Link>
            ) : null}
            <form action={clearMusteriLoginSessionAction}>
              <button type="submit" className="inline-flex rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white">
                Farklı hesapla giriş
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mb-6">
        <GoogleAuthButton nextPath={MUSTERI_HOME_PATH} intent="customer" label="Google ile müşteri girişi" />
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
        <div className="space-y-2">
          <label htmlFor={`${formId}-email`} className="block text-sm font-semibold">
            E-posta
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${formId}-pass`} className="block text-sm font-semibold">
              Şifre
            </label>
            <Link href="/sifremi-unuttum" className="text-xs font-medium text-primary hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <input
            id={`${formId}-pass`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {state && "error" in state ? (
          <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white disabled:opacity-60"
        >
          {pending ? "Giriş yapılıyor…" : "Müşteri girişi"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-secondary">
        Hesabınız yok mu?{" "}
        <Link href={MUSTERI_REGISTER_PATH} className="font-semibold text-primary hover:underline">
          Müşteri kaydı
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-secondary">
        Restoran mısınız?{" "}
        <Link href="/giris" className="font-semibold text-primary hover:underline">
          Restoran girişi
        </Link>
      </p>
    </>
  );
}
