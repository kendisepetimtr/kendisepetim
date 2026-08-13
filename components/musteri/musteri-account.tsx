"use client";

import Link from "next/link";
import { getGuestCustomer, saveGuestProfile } from "@/lib/guest-customer";
import { formatTrPhoneDisplay, normalizeTrPhone } from "@/lib/phone-tr";
import {
  MUSTERI_LOGIN_PATH,
  MUSTERI_REGISTER_PATH,
} from "@/lib/musteri/paths";
import {
  saveCustomerProfileAction,
  signOutMusteriAction,
} from "@/app/musteri/actions";
import { useEffect, useState, useTransition } from "react";

type Props = {
  isCustomer: boolean;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string;
};

export default function MusteriAccount({ isCustomer, email, firstName, lastName, phone }: Props) {
  const [form, setForm] = useState({ firstName, lastName, phone, email: email ?? "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (isCustomer) {
      setForm({ firstName, lastName, phone, email: email ?? "" });
      return;
    }
    const g = getGuestCustomer();
    setForm({
      firstName: g.firstName,
      lastName: g.lastName,
      phone: g.phone,
      email: g.email,
    });
  }, [isCustomer, firstName, lastName, phone, email]);

  return (
    <div>
      <h1 className="font-headline text-2xl font-extrabold tracking-tight">Hesabım</h1>
      <p className="mt-1 text-sm text-secondary">
        {isCustomer
          ? "Profil bilgileriniz siparişte otomatik doldurulur."
          : "Misafir bilgileri bu cihazda saklanır. Hesap açınca her yerden ulaşabilirsiniz."}
      </p>

      {!isCustomer ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={MUSTERI_LOGIN_PATH}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Müşteri girişi
          </Link>
          <Link
            href={MUSTERI_REGISTER_PATH}
            className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-bold"
          >
            Hesap oluştur
          </Link>
        </div>
      ) : null}

      <form
        className="mt-6 space-y-4 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSaved(false);
          const normalized = form.phone.trim() ? normalizeTrPhone(form.phone) : "";
          if (form.phone.trim() && !normalized) {
            setError("Geçerli bir Türkiye cep telefonu girin.");
            return;
          }
          const phoneValue = normalized || form.phone.trim();
          if (!isCustomer) {
            saveGuestProfile({
              firstName: form.firstName,
              lastName: form.lastName,
              phone: phoneValue,
              email: form.email,
            });
            setSaved(true);
            return;
          }
          startTransition(async () => {
            const res = await saveCustomerProfileAction({
              firstName: form.firstName,
              lastName: form.lastName,
              phone: phoneValue,
            });
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setSaved(true);
          });
        }}
      >
        <Field
          label="Ad"
          value={form.firstName}
          onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
        />
        <Field
          label="Soyad"
          value={form.lastName}
          onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
        />
        <Field
          label="Telefon"
          value={form.phone}
          onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
          onBlur={() => {
            if (normalizeTrPhone(form.phone)) {
              setForm((p) => ({ ...p, phone: formatTrPhoneDisplay(p.phone) }));
            }
          }}
        />
        <Field
          label="E-posta"
          value={form.email}
          onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          disabled={isCustomer}
        />
        {error ? (
          <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">{error}</p>
        ) : null}
        {saved ? <p className="text-sm font-semibold text-emerald-700">Kaydedildi.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      {isCustomer ? (
        <form action={signOutMusteriAction} className="mt-6">
          <button type="submit" className="text-sm font-bold text-secondary hover:text-on-background">
            Çıkış yap
          </button>
        </form>
      ) : (
        <p className="mt-6 text-xs text-secondary">
          Restoran sahibiyseniz burası değil —{" "}
          <Link href="/giris" className="font-semibold text-primary underline-offset-2 hover:underline">
            restoran girişi
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className="w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm disabled:bg-surface-container-low"
      />
    </label>
  );
}
