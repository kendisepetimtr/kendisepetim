"use client";

import { musteriRegisterAction, type MusteriAuthState } from "@/app/musteri/actions";
import LegalSummaryModal, { type LegalModalKind } from "@/components/legal-summary-modal";
import GoogleAuthButton from "@/components/google-auth-button";
import Link from "next/link";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";
import { formatTrPhoneDisplay, normalizeTrPhone } from "@/lib/phone-tr";
import { useActionState, useId, useState } from "react";

type Props = {
  supabaseConfigured: boolean;
};

export default function MusteriRegisterForm({ supabaseConfigured }: Props) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(musteriRegisterAction, null as MusteriAuthState);
  const [phone, setPhone] = useState("");
  const [legalModal, setLegalModal] = useState<LegalModalKind | null>(null);

  if (!supabaseConfigured) {
    return (
      <p className="rounded-2xl border border-outline-variant/60 bg-surface-container-low px-6 py-8 text-center text-sm">
        Kayıt servisi yapılandırılmamış. Yine de misafir olarak sipariş verebilirsiniz.
      </p>
    );
  }

  if (state && "needsEmailConfirm" in state) {
    return (
      <div className="rounded-2xl border border-emerald-600/25 bg-emerald-600/8 px-6 py-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold">E-postanızı doğrulayın</h1>
        <p className="mt-3 text-sm text-secondary">
          {state.email} adresine bir bağlantı gönderdik. Onayladıktan sonra müşteri girişi yapın.
        </p>
        <Link href={MUSTERI_LOGIN_PATH} className="mt-6 inline-flex font-bold text-primary hover:underline">
          Giriş sayfasına git
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Müşteri</p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Hesap oluştur</h1>
        <p className="mt-3 text-sm text-secondary">
          Restoran kaydı değil — yalnızca yemek siparişi için. Restoran hesabınız varsa ayrı e-posta kullanın.
        </p>
      </div>

      <div className="mb-6">
        <GoogleAuthButton nextPath={MUSTERI_HOME_PATH} intent="customer" label="Google ile müşteri kaydı" />
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
        className="space-y-5 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Ad</span>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Soyad</span>
            <input
              name="lastName"
              required
              autoComplete="family-name"
              className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">E-posta</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Telefon</span>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => {
              if (normalizeTrPhone(phone)) setPhone(formatTrPhoneDisplay(phone));
            }}
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
            placeholder="0(5XX) XXX XX XX"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Şifre</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Şifre tekrar</span>
            <input
              name="passwordAgain"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-secondary">
          <input type="checkbox" name="acceptedTerms" className="mt-1 size-4 rounded" />
          <span>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setLegalModal("terms");
              }}
            >
              Kullanım şartları
            </button>{" "}
            ve{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setLegalModal("privacy");
              }}
            >
              gizlilik
            </button>{" "}
            metnini okudum, onaylıyorum.
          </span>
        </label>
        {state && "error" in state ? (
          <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Müşteri hesabı oluştur"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-secondary">
        Zaten hesabınız var mı?{" "}
        <Link href={MUSTERI_LOGIN_PATH} className="font-semibold text-primary hover:underline">
          Müşteri girişi
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-secondary">
        Restoran mı açacaksınız?{" "}
        <Link href="/kayit" className="font-semibold text-primary hover:underline">
          Restoran kaydı
        </Link>
      </p>
      <LegalSummaryModal kind={legalModal} onClose={() => setLegalModal(null)} />
    </>
  );
}
