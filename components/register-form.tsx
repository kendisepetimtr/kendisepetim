"use client";

import { registerTenantAction } from "@/app/kayit/actions";
import LegalSummaryModal, { type LegalModalKind } from "@/components/legal-summary-modal";
import GoogleAuthButton from "@/components/google-auth-button";
import Link from "next/link";
import { getLocalTenant, saveLocalTenant } from "@/lib/local-tenant";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useState, useTransition } from "react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

type RegisterFormProps = {
  /** true ise Supabase hesabı + tenants satırı; false ise yalnızca localStorage (Supabase env yoksa) */
  supabaseConfigured: boolean;
  /** Google vb. ile oturum açık; şifre alanları gizlenir */
  oauthUser?: { email: string; ownerName: string } | null;
};

export default function RegisterForm({ supabaseConfigured, oauthUser = null }: RegisterFormProps) {
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainManual, setSubdomainManual] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmNotice, setEmailConfirmNotice] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<LegalModalKind | null>(null);

  useEffect(() => {
    if (!supabaseConfigured && getLocalTenant()) {
      router.replace("/dashboard");
    }
  }, [router, supabaseConfigured]);

  useEffect(() => {
    if (!oauthUser) return;
    if (oauthUser.email) setEmail(oauthUser.email);
    if (oauthUser.ownerName && !ownerName) setOwnerName(oauthUser.ownerName);
  }, [oauthUser, ownerName]);

  const oauthMode = supabaseConfigured && !!oauthUser;

  const hostPreview = subdomain ? `${subdomain}.kendisepetim.com` : "isletmeniz.kendisepetim.com";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailConfirmNotice(null);

    if (!subdomain || subdomain.length < 2) {
      setError("Alt alan adı en az 2 karakter olmalıdır.");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
      setError("Alt alan adı yalnızca küçük harf, rakam ve tire içerebilir; tire ile başlayıp bitemez.");
      return;
    }
    if (!acceptedTerms) {
      setError("Devam etmek için kullanım şartlarını onaylayın.");
      return;
    }

    if (!oauthMode) {
      if (password.length < 8) {
        setError("Şifre en az 8 karakter olmalıdır.");
        return;
      }
      if (password !== passwordAgain) {
        setError("Şifreler eşleşmiyor.");
        return;
      }
    }

    if (supabaseConfigured) {
      const fd = new FormData();
      fd.set("businessName", businessName.trim());
      fd.set("subdomain", subdomain.trim().toLowerCase());
      fd.set("ownerName", ownerName.trim());
      fd.set("email", email.trim().toLowerCase());
      fd.set("phone", phone.trim());
      fd.set("password", password);
      fd.set("passwordAgain", passwordAgain);
      fd.set("acceptedTerms", acceptedTerms ? "on" : "off");

      startTransition(async () => {
        try {
          const res = await registerTenantAction(null, fd);
          if (res && "error" in res) {
            setError(res.error);
            return;
          }
          if (res && "needsEmailConfirm" in res && res.needsEmailConfirm) {
            setEmailConfirmNotice(
              `Doğrulama bağlantısı ${res.email} adresine gönderildi. E-postayı onayladıktan sonra giriş yapın.`,
            );
            return;
          }
        } catch (err) {
          const digest =
            err && typeof err === "object" && "digest" in err
              ? String((err as { digest?: unknown }).digest ?? "")
              : "";
          if (digest.includes("NEXT_REDIRECT")) {
            return;
          }
          setError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
        }
      });
      return;
    }

    saveLocalTenant({
      businessName: businessName.trim(),
      subdomain: subdomain.trim(),
      ownerName: ownerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      logoDataUrl: "",
      coverImageUrl: "",
      publicDescription: "",
      googleMapsUrl: "",
      seoIndexEnabled: false,
      hoursDayMode: "calendar",
      openTime: "09:00",
      closeTime: "22:00",
      paymentCash: true,
      paymentDoorCard: false,
      paymentMealCard: false,
    });
    router.push("/dashboard");
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Hesabınızı oluşturun
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          Menünüz{" "}
          <span className="font-medium text-on-background">restoranadiniz.kendisepetim.com</span> adresinde yayınlanır;
          yönetim paneli ve QR menü tek hesaptan yönetilir.
        </p>
        {supabaseConfigured ? (
          <p className="mt-2 text-xs text-secondary">
            {oauthMode
              ? "Google hesabınız bağlandı. İşletme bilgilerinizi tamamlayın; şifre gerekmez."
              : (
                <>
                  Kayıt sonrası panele e-posta ve şifrenizle{" "}
                  <Link href="/giris?kayit=tamam" className="font-medium text-primary underline-offset-2 hover:underline">
                    giriş
                  </Link>{" "}
                  yaparsınız.
                </>
              )}
          </p>
        ) : null}
      </div>

      {supabaseConfigured && !oauthMode ? (
        <div className="mb-6">
          <GoogleAuthButton nextPath="/dashboard" label="Google ile kayıt ol" />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-surface-container-highest" />
            </div>
            <p className="relative mx-auto w-fit bg-background px-3 text-xs font-medium uppercase tracking-wide text-secondary">
              veya e-posta ile
            </p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 shadow-sm"
        noValidate
      >
      <div className="space-y-2">
        <label htmlFor={`${formId}-business`} className="block text-sm font-semibold text-on-background">
          İşletme adı
        </label>
        <input
          id={`${formId}-business`}
          name="businessName"
          type="text"
          autoComplete="organization"
          required
          value={businessName}
          onChange={(e) => {
            const nextBusinessName = e.target.value;
            setBusinessName(nextBusinessName);
            if (!subdomainManual) {
              setSubdomain(slugify(nextBusinessName));
            }
          }}
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Örn. Smash Burger Kadıköy"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${formId}-subdomain`} className="block text-sm font-semibold text-on-background">
          Alt alan adı
        </label>
        <p className="text-xs text-secondary">
          Resmi menü adresiniz: seçtiğiniz ad + .kendisepetim.com (yalnızca küçük harf, rakam ve tire).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id={`${formId}-subdomain`}
            name="subdomain"
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={subdomain}
            onChange={(e) => {
              setSubdomainManual(true);
              setSubdomain(slugify(e.target.value));
            }}
            className="min-w-0 flex-1 rounded-xl border border-surface-container-highest bg-white px-4 py-3 font-mono text-sm text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="smashburger"
          />
          <span className="shrink-0 rounded-xl border border-dashed border-outline/40 bg-surface-container-low px-4 py-3 text-center text-sm text-secondary">
            .kendisepetim.com
          </span>
        </div>
        <p className="rounded-lg bg-surface-container-low px-3 py-2 font-mono text-xs text-secondary">
          Önizleme: <span className="font-semibold text-primary">{hostPreview}</span>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${formId}-owner`} className="block text-sm font-semibold text-on-background">
          Yetkili adı soyadı
        </label>
        <input
          id={`${formId}-owner`}
          name="ownerName"
          type="text"
          autoComplete="name"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Ad Soyad"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
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
            readOnly={oauthMode}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20${oauthMode ? " cursor-not-allowed bg-surface-container-low" : ""}`}
            placeholder="siz@isletme.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${formId}-phone`} className="block text-sm font-semibold text-on-background">
            Cep telefonu
          </label>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="+90 5xx xxx xx xx"
          />
        </div>
      </div>

      {!oauthMode ? (
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${formId}-pass`} className="block text-sm font-semibold text-on-background">
            Şifre
          </label>
          <input
            id={`${formId}-pass`}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="En az 8 karakter"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${formId}-pass2`} className="block text-sm font-semibold text-on-background">
            Şifre tekrar
          </label>
          <input
            id={`${formId}-pass2`}
            name="passwordAgain"
            type="password"
            autoComplete="new-password"
            required
            value={passwordAgain}
            onChange={(e) => setPasswordAgain(e.target.value)}
            className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-on-background shadow-sm outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Tekrar girin"
          />
        </div>
      </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 text-sm text-secondary">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1 size-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
        />
        <span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLegalModal("terms");
            }}
          >
            Kullanım şartları
          </button>{" "}
          ve{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLegalModal("privacy");
            }}
          >
            gizlilik politikasını
          </button>{" "}
          okudum, kabul ediyorum.
        </span>
      </label>

      {error ? (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {emailConfirmNotice ? (
        <p
          className="rounded-lg border border-tertiary/25 bg-tertiary/5 px-4 py-3 text-sm text-on-background"
          role="status"
        >
          {emailConfirmNotice}{" "}
          <Link href="/giris?kayit=tamam" className="font-semibold text-primary underline-offset-2 hover:underline">
            Giriş sayfası
          </Link>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 enabled:active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Kayıt yapılıyor…" : "Hesabımı oluştur"}
      </button>
      </form>

      <LegalSummaryModal kind={legalModal} onClose={() => setLegalModal(null)} />
    </>
  );
}
