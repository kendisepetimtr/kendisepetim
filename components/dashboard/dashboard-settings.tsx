"use client";

import { clearAllMenuDataAction } from "@/app/dashboard/menu-actions";
import { updateTenantBusinessSettingsAction } from "@/app/dashboard/tenant-settings-actions";
import type { BusinessHoursDayMode } from "@/lib/business-hours";
import { isValidGoogleMapsUrl } from "@/lib/google-maps";
import {
  MAX_TENANT_LOGO_DATA_URL_LENGTH,
  saveLocalTenant,
  type LocalTenantProfile,
} from "@/lib/local-tenant";
import { MAX_MENU_IMAGE_FILE_BYTES, isAllowedMenuImageType } from "@/lib/menu-images";
import { type FormEvent, useEffect, useId, useState, useTransition } from "react";

const LOGO_MAX_FILE_BYTES = 600 * 1024;
const MAX_PUBLIC_DESCRIPTION_LENGTH = 280;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("Dosya okunamadı"));
    r.readAsDataURL(file);
  });
}

type DashboardSettingsProps = {
  tenant: LocalTenantProfile;
  onTenantUpdate: (tenant: LocalTenantProfile) => void;
  onMenuCleared: () => void;
  onSignOut: () => void | Promise<void>;
  /** Supabase oturumu varsa ayarlar veritabanına yazılır */
  persistSettingsToSupabase?: boolean;
};

export default function DashboardSettings({
  tenant,
  onTenantUpdate,
  onMenuCleared,
  onSignOut,
  persistSettingsToSupabase = false,
}: DashboardSettingsProps) {
  const baseId = useId();
  const [savePending, startSaveTransition] = useTransition();
  const [businessName, setBusinessName] = useState(tenant.businessName);
  const [ownerName, setOwnerName] = useState(tenant.ownerName);
  const [email, setEmail] = useState(tenant.email);
  const [phone, setPhone] = useState(tenant.phone);
  const [logoDataUrl, setLogoDataUrl] = useState(tenant.logoDataUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(tenant.coverImageUrl);
  const [coverUploading, setCoverUploading] = useState(false);
  const [publicDescription, setPublicDescription] = useState(tenant.publicDescription);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(tenant.googleMapsUrl);
  const [seoIndexEnabled, setSeoIndexEnabled] = useState(tenant.seoIndexEnabled);
  const [hoursDayMode, setHoursDayMode] = useState<BusinessHoursDayMode>(tenant.hoursDayMode);
  const [openTime, setOpenTime] = useState(tenant.openTime);
  const [closeTime, setCloseTime] = useState(tenant.closeTime);
  const [paymentCash, setPaymentCash] = useState(tenant.paymentCash);
  const [paymentDoorCard, setPaymentDoorCard] = useState(tenant.paymentDoorCard);
  const [paymentMealCard, setPaymentMealCard] = useState(tenant.paymentMealCard);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setBusinessName(tenant.businessName);
    setOwnerName(tenant.ownerName);
    setEmail(tenant.email);
    setPhone(tenant.phone);
    setLogoDataUrl(tenant.logoDataUrl);
    setCoverImageUrl(tenant.coverImageUrl);
    setPublicDescription(tenant.publicDescription);
    setGoogleMapsUrl(tenant.googleMapsUrl);
    setSeoIndexEnabled(tenant.seoIndexEnabled);
    setHoursDayMode(tenant.hoursDayMode);
    setOpenTime(tenant.openTime);
    setCloseTime(tenant.closeTime);
    setPaymentCash(tenant.paymentCash);
    setPaymentDoorCard(tenant.paymentDoorCard);
    setPaymentMealCard(tenant.paymentMealCard);
  }, [tenant]);

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    const bn = businessName.trim();
    const on = ownerName.trim();
    const em = email.trim();
    const ph = phone.trim();
    const gm = googleMapsUrl.trim();
    if (!bn || !on || !em || !ph) {
      window.alert("İşletme adı, yetkili adı, e-posta ve telefon zorunludur.");
      return;
    }
    if (!isValidGoogleMapsUrl(gm)) {
      window.alert("Lütfen geçerli bir Google Maps bağlantısı girin.");
      return;
    }
    if (!paymentCash && !paymentDoorCard && !paymentMealCard) {
      window.alert("QR sipariş için en az bir kapıda ödeme yöntemi seçmelisiniz.");
      return;
    }
    if (coverUploading) {
      window.alert("Kapak görseli yükleme tamamlanmadan kaydedemezsiniz.");
      return;
    }

    const next: LocalTenantProfile = {
      ...tenant,
      businessName: bn,
      ownerName: on,
      email: em,
      phone: ph,
      logoDataUrl,
      coverImageUrl,
      publicDescription: publicDescription.trim().slice(0, MAX_PUBLIC_DESCRIPTION_LENGTH),
      googleMapsUrl: gm,
      seoIndexEnabled,
      hoursDayMode,
      openTime,
      closeTime,
      paymentCash,
      paymentDoorCard,
      paymentMealCard,
    };

    if (persistSettingsToSupabase) {
      startSaveTransition(async () => {
        const res = await updateTenantBusinessSettingsAction({
          businessName: bn,
          ownerName: on,
          email: em,
          phone: ph,
          logoDataUrl,
          coverImageUrl,
          publicDescription,
          googleMapsUrl: gm,
          seoIndexEnabled,
          hoursDayMode,
          openTime,
          closeTime,
          paymentCash,
          paymentDoorCard,
          paymentMealCard,
        });
        if (!res.ok) {
          window.alert(res.error);
          return;
        }
        saveLocalTenant(res.profile);
        onTenantUpdate(res.profile);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2200);
      });
      return;
    }

    saveLocalTenant(next);
    onTenantUpdate(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  function handleCopySubdomain() {
    const text = tenant.subdomain;
    void navigator.clipboard.writeText(text).then(
      () => {},
      () => window.alert("Kopyalanamadı; elle seçip kopyalayın."),
    );
  }

  function handleClearMenu() {
    if (
      !window.confirm(
        "Menüdeki tüm kategoriler ve ürünler silinecek. Bu işlem geri alınamaz. Devam edilsin mi?",
      )
    ) {
      return;
    }
    if (persistSettingsToSupabase) {
      startSaveTransition(async () => {
        const res = await clearAllMenuDataAction();
        if (!res.ok) {
          window.alert(res.error);
          return;
        }
        onMenuCleared();
        window.alert("Menü verisi temizlendi.");
      });
      return;
    }
    window.alert("Menü artık veritabanında tutuluyor; bu işlem için sunucu bağlantısı gerekli.");
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Lütfen bir görsel dosyası seçin.");
      return;
    }
    if (file.size > LOGO_MAX_FILE_BYTES) {
      window.alert(`Logo çok büyük (en fazla ~${Math.round(LOGO_MAX_FILE_BYTES / 1024)} KB).`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl.length > MAX_TENANT_LOGO_DATA_URL_LENGTH) {
        window.alert("Görsel sıkıştırıldıktan sonra bile çok büyük; daha küçük bir dosya deneyin.");
        return;
      }
      setLogoDataUrl(dataUrl);
    } catch {
      window.alert("Görsel yüklenemedi.");
    }
  }

  async function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedMenuImageType(file.type)) {
      window.alert("Yalnızca JPG, PNG veya WebP görseller yüklenebilir.");
      return;
    }
    if (file.size > MAX_MENU_IMAGE_FILE_BYTES) {
      window.alert(`Kapak görseli çok büyük (en fazla ~${Math.round(MAX_MENU_IMAGE_FILE_BYTES / 1024)} KB).`);
      return;
    }

    setCoverUploading(true);
    try {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("kind", "cover");
      const res = await fetch("/api/menu/upload-image", {
        method: "POST",
        body: payload,
      });
      const json = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || !json.imageUrl) {
        window.alert(json.error ?? "Kapak görseli yüklenemedi.");
        return;
      }
      setCoverImageUrl(json.imageUrl);
    } catch {
      window.alert("Kapak görseli yüklenemedi.");
    } finally {
      setCoverUploading(false);
    }
  }

  const registered = new Date(tenant.registeredAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Ayarlar
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          İşletme ve iletişim bilgilerinizi güncelleyin.{" "}
          {persistSettingsToSupabase
            ? "Değişiklikler hesabınıza bağlı bulutta kaydedilir; bu cihazda da önbelleğe yazılır."
            : "Veriler şimdilik yalnızca bu tarayıcıda saklanır."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-background">İşletme profili</h2>
              <p className="mt-1 text-sm text-secondary">
                Logo QR menü ve panelde işletmenizi temsil eder; diğer alanlar kayıtla birlikte saklanır.
              </p>
            </div>
            {savedFlash ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800">
                Kaydedildi
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSaveProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="block text-xs font-medium text-secondary" id={`${baseId}-logo-label`}>
                İşletme logosu
              </span>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-low">
                  {logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoDataUrl} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-secondary/40" aria-hidden>
                      store
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    id={`${baseId}-logo`}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full max-w-sm text-sm text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-container"
                    aria-labelledby={`${baseId}-logo-label`}
                  />
                  <p className="text-[11px] text-secondary">
                    Kare veya yatay logo önerilir. Yaklaşık {Math.round(LOGO_MAX_FILE_BYTES / 1024)} KB’a kadar.
                    {persistSettingsToSupabase ? " Bulutta saklanır." : " Tarayıcıda saklanır."}
                  </p>
                  {logoDataUrl ? (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl("")}
                      className="text-xs font-semibold text-primary hover:text-primary-container"
                    >
                      Logoyu kaldır
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="block text-xs font-medium text-secondary" id={`${baseId}-cover-label`}>
                QR menu kapak gorseli
              </span>
              <div className="mt-2 space-y-3">
                <input
                  id={`${baseId}-cover`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverImageChange}
                  disabled={coverUploading}
                  className="block w-full max-w-sm text-sm text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-container"
                  aria-labelledby={`${baseId}-cover-label`}
                />
                <p className="text-[11px] text-secondary">
                  Header alaninda buyuk kapak olarak kullanilir. Yaklasik {Math.round(MAX_MENU_IMAGE_FILE_BYTES / 1024)} KB&apos;a kadar.
                </p>
                {coverUploading ? (
                  <p className="text-xs font-medium text-primary">Kapak gorseli yukleniyor...</p>
                ) : null}
                {coverImageUrl ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImageUrl}
                      alt=""
                      className="h-32 w-full max-w-lg rounded-2xl border border-surface-container-high object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl("")}
                      className="text-xs font-semibold text-primary hover:text-primary-container"
                    >
                      Kapak gorselini kaldir
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-biz`}>
                İşletme adı
              </label>
              <input
                id={`${baseId}-biz`}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                autoComplete="organization"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-owner`}>
                Yetkili adı soyadı
              </label>
              <input
                id={`${baseId}-owner`}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-email`}>
                E-posta
              </label>
              <input
                id={`${baseId}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {persistSettingsToSupabase ? (
                <p className="mt-1 text-[11px] text-secondary">
                  İletişim için; panel girişi mevcut hesap e-postanızdır (şimdilik ayrı tutulur).
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-phone`}>
                Telefon
              </label>
              <input
                id={`${baseId}-phone`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="sm:col-span-2 mt-2 rounded-xl border border-surface-container-high bg-surface-container-low/50 p-4">
              <h3 className="font-headline text-sm font-bold text-on-background">QR menu vitrini</h3>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                Bu alanlar restoranin public QR menusunde gorunen tanitim bilgilerini ve arama motoru davranisini belirler.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-public-desc`}>
                    Restoran aciklamasi
                  </label>
                  <textarea
                    id={`${baseId}-public-desc`}
                    value={publicDescription}
                    onChange={(e) => setPublicDescription(e.target.value.slice(0, MAX_PUBLIC_DESCRIPTION_LENGTH))}
                    rows={3}
                    maxLength={MAX_PUBLIC_DESCRIPTION_LENGTH}
                    className="mt-1 w-full resize-y rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-1 text-[11px] text-secondary">
                    {publicDescription.length}/{MAX_PUBLIC_DESCRIPTION_LENGTH} karakter. QR menu ustunde ve SEO aciklamasinda kullanilir.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-maps`}>
                    Google Maps baglantisi
                  </label>
                  <input
                    id={`${baseId}-maps`}
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-1 text-[11px] text-secondary">
                    Header&apos;daki konum butonu ve alt bilgi karti bu baglantiyi kullanir.
                  </p>
                </div>

                <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="checkbox"
                    checked={seoIndexEnabled}
                    onChange={(e) => setSeoIndexEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Arama motorlarinda gorunsun</span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      Local gelistirmede anlamsiz olabilir; canliya alindiginda QR menu indexlenebilir olur.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 rounded-xl border border-surface-container-high bg-surface-container-low/50 p-4">
              <h3 className="font-headline text-sm font-bold text-on-background">Çalışma saatleri</h3>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                Aşağıdaki saatler QR menüde &quot;Şu an açık / kapalı&quot; için kullanılır. Kapanış, açılıştan
                önceyse (ör. 09:00–03:00) gece yarısını geçen vardiya sayılır.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="min-w-[140px]">
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-open`}>
                    Açılış
                  </label>
                  <input
                    id={`${baseId}-open`}
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="min-w-[140px]">
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-close`}>
                    Kapanış
                  </label>
                  <input
                    id={`${baseId}-close`}
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <fieldset className="mt-5 space-y-3">
                <legend className="text-xs font-semibold text-on-background">Gün sonu ve raporlar (ileride)</legend>
                <p className="text-[11px] text-secondary">
                  Sipariş ve ciro gününü nasıl böleceğinizi seçin. QR menü açık/kapalı hesabı yalnızca yukarıdaki
                  saatlere bakar.
                </p>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="radio"
                    name={`${baseId}-hours-mode`}
                    checked={hoursDayMode === "calendar"}
                    onChange={() => setHoursDayMode("calendar")}
                    className="mt-0.5 h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Takvim günü</span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      Gün 00:00–23:59 arası; raporlar gece yarısında kapanır (klasik POS).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="radio"
                    name={`${baseId}-hours-mode`}
                    checked={hoursDayMode === "shift"}
                    onChange={() => setHoursDayMode("shift")}
                    className="mt-0.5 h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Vardiya / mesai aralığı</span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      Örneğin 09:00 açılış 03:00 kapanış: iş günü açılıştan kapanışa kadar sayılır; raporlar bu
                      sınıra göre gruplanacak.
                    </span>
                  </span>
                </label>
              </fieldset>
            </div>

            <div className="sm:col-span-2 mt-2 rounded-xl border border-surface-container-high bg-surface-container-low/50 p-4">
              <h3 className="font-headline text-sm font-bold text-on-background">QR sipariş — kapıda ödeme</h3>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                Çevrimiçi ödeme yok. Müşteri siparişi onaylarken yalnızca burada işaretlediğiniz yöntemleri görür.
                Yemek kartı açıksa Multinet, Sodexo ve Edenred (Ticket Restaurant) seçenekleri sunulur.
              </p>
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="checkbox"
                    checked={paymentCash}
                    onChange={(e) => setPaymentCash(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Kapıda nakit</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="checkbox"
                    checked={paymentDoorCard}
                    onChange={(e) => setPaymentDoorCard(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Kapıda kredi kartı</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
                  <input
                    type="checkbox"
                    checked={paymentMealCard}
                    onChange={(e) => setPaymentMealCard(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-background">Yemek kartı</span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      Açıkken müşteri kart türünü (Multinet / Sodexo / Edenred) seçer.
                    </span>
                  </span>
                </label>
              </div>
              {!paymentCash && !paymentDoorCard && !paymentMealCard ? (
                <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-950">
                  Hiçbir yöntem seçili değil; QR menüde müşteri siparişi tamamlayamaz. En az birini işaretleyin.
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={savePending || coverUploading}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-container disabled:opacity-60"
              >
                {savePending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Resmi menü adresi</h2>
          <p className="mt-1 text-sm text-secondary">
            QR menü ve paylaşımlarda kullanılan subdomain. Değiştirmek veri ve bağlantılarınızı etkiler; şimdilik salt
            okunur.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2 font-mono text-sm font-semibold text-on-background">
              {tenant.subdomain}
            </code>
            <button
              type="button"
              onClick={handleCopySubdomain}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              Kopyala
            </button>
          </div>
          <p className="mt-3 text-xs text-secondary">
            Örnek adres:{" "}
            <span className="font-mono text-on-background/90">
              https://{tenant.subdomain}.kendisepetim.com
            </span>
          </p>
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Hesap</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-secondary">
                {persistSettingsToSupabase ? "Kayıt tarihi" : "Yerel kayıt tarihi"}
              </dt>
              <dd className="mt-0.5 font-medium text-on-background">
                {registered.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-secondary">
            {persistSettingsToSupabase
              ? "Ayarlarınız hesabınıza bağlıdır; başka cihazdan girişte sunucudaki profil yüklenir."
              : "Gerçek hesap, şifre sıfırlama ve çoklu cihaz senkronu canlı altyapı ile eklenecek."}
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 w-full rounded-xl border border-surface-container-highest bg-white py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low sm:w-auto sm:px-5"
          >
            Çıkış yap
          </button>
        </section>

        <section className="rounded-2xl border border-error/25 bg-error/5 p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-error">
              <span className="material-symbols-outlined text-[22px]" aria-hidden>
                warning
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-headline text-lg font-bold text-on-background">Tehlikeli bölge</h2>
              <p className="mt-1 text-sm text-secondary">
                Menü verisini sıfırlamak tüm kategorileri ve ürünleri bu cihazdan siler. İşletme kaydı (kayıt
                bilgileriniz) silinmez.
              </p>
              <button
                type="button"
                onClick={handleClearMenu}
                className="mt-4 rounded-xl border border-error/40 bg-white px-4 py-2.5 text-sm font-semibold text-error hover:bg-error/10"
              >
                Menü verisini sıfırla
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
