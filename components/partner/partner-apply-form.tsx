"use client";

import { registerTenantAction } from "@/app/kayit/actions";
import Link from "next/link";
import { formatTrPhoneDisplay, normalizeTrBusinessPhone, normalizeTrPhone } from "@/lib/phone-tr";
import { partnerPasswordError } from "@/lib/partner/password";
import { type FormEvent, useId, useRef, useState, useTransition, type RefObject } from "react";

const inputClass =
  "w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20";

type FieldKey =
  | "businessName"
  | "ownerFirstName"
  | "ownerLastName"
  | "email"
  | "phone"
  | "businessPhone"
  | "delivery"
  | "hasDevice"
  | "password"
  | "passwordAgain"
  | "lighting";

export default function PartnerApplyForm({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmNotice, setEmailConfirmNotice] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+90 ");
  const [businessPhone, setBusinessPhone] = useState("+90 ");
  const [deliverySelf, setDeliverySelf] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [hasDevice, setHasDevice] = useState<"" | "yes" | "no">("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [acceptedLighting, setAcceptedLighting] = useState(false);

  const refs: Record<FieldKey, RefObject<HTMLDivElement | null>> = {
    businessName: useRef<HTMLDivElement>(null),
    ownerFirstName: useRef<HTMLDivElement>(null),
    ownerLastName: useRef<HTMLDivElement>(null),
    email: useRef<HTMLDivElement>(null),
    phone: useRef<HTMLDivElement>(null),
    businessPhone: useRef<HTMLDivElement>(null),
    delivery: useRef<HTMLDivElement>(null),
    hasDevice: useRef<HTMLDivElement>(null),
    password: useRef<HTMLDivElement>(null),
    passwordAgain: useRef<HTMLDivElement>(null),
    lighting: useRef<HTMLDivElement>(null),
  };

  function scrollTo(key: FieldKey) {
    refs[key].current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function firstMissing(): { key: FieldKey; message: string } | null {
    if (!businessName.trim()) return { key: "businessName", message: "Tabela adı zorunludur." };
    if (!ownerFirstName.trim()) return { key: "ownerFirstName", message: "İşletme sahibi adı zorunludur." };
    if (!ownerLastName.trim()) return { key: "ownerLastName", message: "İşletme sahibi soyadı zorunludur." };
    if (!email.trim()) return { key: "email", message: "E-posta zorunludur." };
    if (!normalizeTrPhone(phone)) return { key: "phone", message: "Geçerli bir cep numarası girin." };
    if (!normalizeTrBusinessPhone(businessPhone)) {
      return { key: "businessPhone", message: "Geçerli bir iş telefonu girin." };
    }
    if (!deliverySelf && !pickup) {
      return { key: "delivery", message: "En az bir teslimat seçeneği işaretleyin." };
    }
    if (!hasDevice) return { key: "hasDevice", message: "Cihaz ve internet sorusunu yanıtlayın." };
    const pwErr = partnerPasswordError(password);
    if (pwErr) return { key: "password", message: pwErr };
    if (password !== passwordAgain) return { key: "passwordAgain", message: "Şifreler eşleşmiyor." };
    if (!acceptedLighting) return { key: "lighting", message: "Aydınlatma metnini onaylayın." };
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailConfirmNotice(null);
    const missing = firstMissing();
    if (missing) {
      setError(missing.message);
      scrollTo(missing.key);
      return;
    }
    if (!supabaseConfigured) {
      setError("Kayıt servisi yapılandırılmamış.");
      return;
    }

    const fd = new FormData();
    fd.set("businessName", businessName.trim());
    fd.set("ownerFirstName", ownerFirstName.trim());
    fd.set("ownerLastName", ownerLastName.trim());
    fd.set("email", email.trim().toLowerCase());
    fd.set("phone", phone);
    fd.set("businessPhone", businessPhone);
    fd.set("password", password);
    fd.set("passwordAgain", passwordAgain);
    fd.set("acceptedLighting", "on");
    if (deliverySelf) fd.set("deliverySelf", "on");
    if (pickup) fd.set("pickup", "on");
    fd.set("hasDeviceInternet", hasDevice);

    startTransition(async () => {
      try {
        const res = await registerTenantAction(null, fd);
        if (res && "error" in res) {
          setError(res.error);
          return;
        }
        if (res && "needsEmailConfirm" in res && res.needsEmailConfirm) {
          setEmailConfirmNotice(
            `Talebiniz alındı. Doğrulama bağlantısı ${res.email} adresine gönderildi. Onayladıktan sonra giriş yapabilirsiniz.`,
          );
        }
      } catch (err) {
        const digest =
          err && typeof err === "object" && "digest" in err
            ? String((err as { digest?: unknown }).digest ?? "")
            : "";
        if (digest.includes("NEXT_REDIRECT")) return;
        setError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
      }
    });
  }

  const filled =
    4 +
    (businessName.trim() ? 1 : 0) +
    (ownerFirstName.trim() && ownerLastName.trim() ? 1 : 0) +
    (email.trim() ? 1 : 0) +
    (normalizeTrPhone(phone) ? 1 : 0) +
    (normalizeTrBusinessPhone(businessPhone) ? 1 : 0) +
    (deliverySelf || pickup ? 1 : 0) +
    (hasDevice ? 1 : 0) +
    (!partnerPasswordError(password) && password === passwordAgain && password ? 1 : 0) +
    (acceptedLighting ? 1 : 0);
  const total = 12;
  const progress = Math.round((filled / total) * 100);

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low px-6 py-8 text-center text-sm">
        <p className="font-headline text-lg font-bold">Kayıt servisi yapılandırılmamış</p>
        <p className="mt-3 text-secondary">Supabase ortam değişkenleri tanımlı olmalı.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Partner başvurusu</p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Restoranını KendiSepetim’e taşı
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          QR menü ücretsizdir. Başvuru incelenir; onaydan sonra menü adresiniz ve panel açılır.
        </p>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs font-semibold text-secondary">
          <span>Başvuru</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm sm:p-8" noValidate>
        <div ref={refs.businessName} className="space-y-2">
          <label htmlFor={`${formId}-tabela`} className="block text-sm font-semibold">Tabela adı</label>
          <input id={`${formId}-tabela`} className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="Örn. Smash Burger Kadıköy" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div ref={refs.ownerFirstName} className="space-y-2">
            <label htmlFor={`${formId}-ad`} className="block text-sm font-semibold">İşletme sahibi adı</label>
            <input id={`${formId}-ad`} className={inputClass} value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} required autoComplete="given-name" />
          </div>
          <div ref={refs.ownerLastName} className="space-y-2">
            <label htmlFor={`${formId}-soyad`} className="block text-sm font-semibold">İşletme sahibi soyadı</label>
            <input id={`${formId}-soyad`} className={inputClass} value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} required autoComplete="family-name" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold">İş tipi</label>
            <input className={`${inputClass} cursor-not-allowed bg-surface-container-low`} value="Restoran" readOnly />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Şube sayısı</label>
            <input className={`${inputClass} cursor-not-allowed bg-surface-container-low`} value="1" readOnly />
          </div>
        </div>

        <div ref={refs.email} className="space-y-2">
          <label htmlFor={`${formId}-email`} className="block text-sm font-semibold">İşletme e-posta adresi</label>
          <input id={`${formId}-email`} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div ref={refs.phone} className="space-y-2">
            <label htmlFor={`${formId}-cep`} className="block text-sm font-semibold">Cep numarası</label>
            <input
              id={`${formId}-cep`}
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value.startsWith("+90") ? e.target.value : `+90 ${e.target.value.replace(/^\+?90\s*/, "")}`)}
              onBlur={() => {
                if (normalizeTrPhone(phone)) setPhone(formatTrPhoneDisplay(phone));
              }}
              required
            />
            <p className="text-xs text-secondary">Türkiye alan kodu +90 sabittir.</p>
          </div>
          <div ref={refs.businessPhone} className="space-y-2">
            <label htmlFor={`${formId}-is`} className="block text-sm font-semibold">İş telefonu</label>
            <input
              id={`${formId}-is`}
              type="tel"
              className={inputClass}
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value.startsWith("+90") ? e.target.value : `+90 ${e.target.value.replace(/^\+?90\s*/, "")}`)}
              required
            />
          </div>
        </div>

        <div ref={refs.delivery} className="space-y-3">
          <p className="text-sm font-semibold">Siparişlerinizi nasıl teslim etmek istiyorsunuz? *</p>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-highest px-4 py-3">
            <input type="checkbox" className="mt-1 size-4" checked={deliverySelf} onChange={(e) => setDeliverySelf(e.target.checked)} />
            <span>
              <span className="block font-semibold text-on-background">İşletme teslimatı</span>
              <span className="text-xs text-secondary">Kendi kuryenizle paket gönderirsiniz.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-highest px-4 py-3">
            <input type="checkbox" className="mt-1 size-4" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
            <span>
              <span className="block font-semibold text-on-background">Gel al</span>
              <span className="text-xs text-secondary">Müşteri restorandan teslim alır.</span>
            </span>
          </label>
          <div className="rounded-xl border border-dashed border-outline/40 bg-surface-container-low px-4 py-3 opacity-70">
            <p className="font-semibold text-on-background">KendiSepetim kuryesi</p>
            <p className="text-xs text-secondary">Yakında — henüz aktif değil.</p>
          </div>
        </div>

        <div ref={refs.hasDevice} className="space-y-3">
          <p className="text-sm font-semibold">Sipariş yönetimi için bilgisayar, tablet veya telefon ve internet erişimi sağlayabilecek misiniz?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setHasDevice("yes")} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold ${hasDevice === "yes" ? "border-primary bg-primary/10 text-primary" : "border-surface-container-highest"}`}>Evet</button>
            <button type="button" onClick={() => setHasDevice("no")} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold ${hasDevice === "no" ? "border-primary bg-primary/10 text-primary" : "border-surface-container-highest"}`}>Hayır</button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div ref={refs.password} className="space-y-2">
            <label htmlFor={`${formId}-pass`} className="block text-sm font-semibold">Şifre</label>
            <input id={`${formId}-pass`} type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="text-xs text-secondary">En az 8 karakter, 1 büyük harf, 1 rakam, 1 özel karakter.</p>
          </div>
          <div ref={refs.passwordAgain} className="space-y-2">
            <label htmlFor={`${formId}-pass2`} className="block text-sm font-semibold">Şifre tekrar</label>
            <input id={`${formId}-pass2`} type="password" autoComplete="new-password" className={inputClass} value={passwordAgain} onChange={(e) => setPasswordAgain(e.target.value)} required />
          </div>
        </div>

        <div ref={refs.lighting}>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-secondary">
            <input type="checkbox" className="mt-1 size-4" checked={acceptedLighting} onChange={(e) => setAcceptedLighting(e.target.checked)} />
            <span>
              Üye iş yeri{" "}
              <a href="#" className="font-medium text-primary underline-offset-2 hover:underline" onClick={(e) => e.preventDefault()}>
                aydınlatma metninde
              </a>{" "}
              belirtilen bilgileri okudum ve anladım.
            </span>
          </label>
        </div>

        {error ? (
          <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {emailConfirmNotice ? (
          <p className="rounded-lg border border-tertiary/25 bg-tertiary/5 px-4 py-3 text-sm" role="status">
            {emailConfirmNotice}{" "}
            <Link href="/giris?kayit=tamam" className="font-semibold text-primary">Giriş yap</Link>
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60">
          {pending ? "Gönderiliyor…" : "Başlayın"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Zaten bir hesabın var mı?{" "}
        <Link href="/giris" className="font-semibold text-primary underline-offset-2 hover:underline">
          Giriş yap
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-secondary">
        <a href="#" className="font-medium text-primary underline-offset-2 hover:underline" onClick={(e) => e.preventDefault()}>
          KendiSepetim kuryesi olmak ister misin? Buraya tıkla
        </a>
      </p>
    </>
  );
}
