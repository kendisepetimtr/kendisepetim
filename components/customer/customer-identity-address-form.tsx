"use client";

import type { CustomerFormValues } from "@/lib/customer-address";
import { type ReactNode, useId } from "react";

type CustomerIdentityAddressFormProps = {
  idPrefix?: string;
  values: CustomerFormValues;
  onChange: (next: CustomerFormValues) => void;
  /** QR: bilgilerin cihazda saklandığına dair kısa not */
  showPrefillNotice?: boolean;
  showOrderNote?: boolean;
  showCourierNote?: boolean;
  /**
   * Adres bloğunun en üstüne çizilen harita. Verildiğinde mahalle pinden
   * türetilir; verilmezse (kasa akışı) alanlar serbest metin kalır.
   */
  addressMapSlot?: ReactNode;
  /** Mahalle haritadan geliyor — kullanıcı elle değiştiremez, iki adres oluşamaz. */
  neighborhoodReadOnly?: boolean;
  /**
   * Kasa akışı: adres serbest metin kalır, konum yalnızca opsiyonel bir ek.
   * Adres kartından sonra çizilir. Müşteri tarafında `addressMapSlot` kullanın.
   */
  locationSlot?: ReactNode;
  hideAddress?: boolean;
  /** Kayıtlı müşteri: ad / soyad / telefon / e-posta alanlarını gizle */
  hideIdentity?: boolean;
  /** Kasa: telefonu en üste al (canlı arama için) */
  phoneFirst?: boolean;
  /** Telefon alanının hemen altına ek içerik (öneri listesi vb.) */
  phoneFieldSlot?: ReactNode;
};

function patch(values: CustomerFormValues, partial: Partial<CustomerFormValues>): CustomerFormValues {
  return { ...values, ...partial };
}

export default function CustomerIdentityAddressForm({
  idPrefix,
  values,
  onChange,
  showPrefillNotice = false,
  showOrderNote = false,
  showCourierNote = false,
  addressMapSlot = null,
  neighborhoodReadOnly = false,
  locationSlot = null,
  hideAddress = false,
  hideIdentity = false,
  phoneFirst = false,
  phoneFieldSlot = null,
}: CustomerIdentityAddressFormProps) {
  const reactId = useId();
  const base = idPrefix ?? `cust-${reactId}`;

  const inputCls =
    "mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  /** Haritadan türeyen alan — düzenlenemediği görsel olarak da belli olsun. */
  const readOnlyInputCls =
    "mt-1 w-full cursor-not-allowed rounded-xl border border-surface-container-highest bg-surface-container-low px-3 py-2 text-sm font-medium text-on-background focus:outline-none";

  const phoneField = (
    <div>
      <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-ph`}>
        Telefon <span className="text-error">*</span>
      </label>
      <input
        id={`${base}-ph`}
        type="tel"
        inputMode="tel"
        value={values.phone}
        onChange={(e) => onChange(patch(values, { phone: e.target.value }))}
        required
        autoComplete="tel"
        autoFocus={phoneFirst}
        placeholder={phoneFirst ? "Örn. 535…" : undefined}
        className={inputCls}
      />
      {phoneFieldSlot}
    </div>
  );

  const nameFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-fn`}>
          Ad <span className="text-error">*</span>
        </label>
        <input
          id={`${base}-fn`}
          value={values.firstName}
          onChange={(e) => onChange(patch(values, { firstName: e.target.value }))}
          required
          autoComplete="given-name"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-ln`}>
          Soyad <span className="text-error">*</span>
        </label>
        <input
          id={`${base}-ln`}
          value={values.lastName}
          onChange={(e) => onChange(patch(values, { lastName: e.target.value }))}
          required
          autoComplete="family-name"
          className={inputCls}
        />
      </div>
    </div>
  );

  const emailField = (
    <div>
      <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-em`}>
        E-posta
      </label>
      <input
        id={`${base}-em`}
        type="email"
        value={values.email}
        onChange={(e) => onChange(patch(values, { email: e.target.value }))}
        autoComplete="email"
        className={inputCls}
      />
      <p className="mt-1 text-[11px] text-secondary">İsteğe bağlı.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {showPrefillNotice ? (
        <p className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs leading-relaxed text-on-background">
          <span className="font-semibold">Bilgileriniz bu cihazda saklanır.</span> Bir sonraki siparişinizde aynı
          telefon ve adresle hızlıca devam edebilirsiniz; isterseniz alanları güncelleyebilirsiniz. (Veriler yalnızca
          bu tarayıcıda tutulur.)
        </p>
      ) : null}

      {hideIdentity ? null : phoneFirst ? (
        <>
          {phoneField}
          {nameFields}
          {emailField}
        </>
      ) : (
        <>
          {nameFields}
          {phoneField}
          {emailField}
        </>
      )}

      {/* Konum kaynağı adres kartından bağımsız: kayıtlı adres seçilse de pin görünmeli. */}
      {addressMapSlot}

      {hideAddress ? null : (
      <div className="rounded-2xl border border-surface-container-high bg-surface-container-low/40 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">
          {addressMapSlot ? "Adres detayları" : "Adres"}
        </p>
        {addressMapSlot ? (
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            Mahalle yukarıdaki haritadan gelir. Kalan alanları siz doldurun.
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-mah`}>
              Mahalle <span className="text-error">*</span>
            </label>
            <input
              id={`${base}-mah`}
              value={values.neighborhood}
              onChange={(e) => onChange(patch(values, { neighborhood: e.target.value }))}
              required
              readOnly={neighborhoodReadOnly}
              aria-readonly={neighborhoodReadOnly || undefined}
              placeholder={neighborhoodReadOnly ? "Haritadan konum seçin" : undefined}
              autoComplete="address-level3"
              className={neighborhoodReadOnly ? readOnlyInputCls : inputCls}
            />
            {neighborhoodReadOnly ? (
              <p className="mt-1 text-[11px] text-secondary">
                Haritadaki pine göre otomatik dolar; değiştirmek için pini taşıyın.
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-sk`}>
              Sokak / cadde <span className="text-error">*</span>
            </label>
            <input
              id={`${base}-sk`}
              value={values.street}
              onChange={(e) => onChange(patch(values, { street: e.target.value }))}
              required
              autoComplete="street-address"
              className={inputCls}
            />
            {addressMapSlot ? (
              <p className="mt-1 text-[11px] text-secondary">
                Haritadan otomatik gelir. Boş kaldıysa veya yanlışsa düzeltebilirsiniz — kurye yine
                haritadaki pine gider.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-bno`}>
                Apartman no <span className="text-error">*</span>
              </label>
              <input
                id={`${base}-bno`}
                value={values.buildingNo}
                onChange={(e) => onChange(patch(values, { buildingNo: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-bname`}>
                Apartman adı <span className="text-error">*</span>
              </label>
              <input
                id={`${base}-bname`}
                value={values.buildingName}
                onChange={(e) => onChange(patch(values, { buildingName: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-kat`}>
                Kat <span className="text-error">*</span>
              </label>
              <input
                id={`${base}-kat`}
                value={values.floor}
                onChange={(e) => onChange(patch(values, { floor: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-daire`}>
                Daire no <span className="text-error">*</span>
              </label>
              <input
                id={`${base}-daire`}
                value={values.apartmentNo}
                onChange={(e) => onChange(patch(values, { apartmentNo: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-high bg-white/80 p-3">
            <input
              type="checkbox"
              checked={values.livesInSite}
              onChange={(e) => onChange(patch(values, { livesInSite: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span>
              <span className="block text-sm font-medium text-on-background">Site içinde oturuyorum</span>
              <span className="mt-0.5 block text-xs text-secondary">İşaretlerseniz site adı ve blok bilgisi gerekir.</span>
            </span>
          </label>

          {values.livesInSite ? (
            <div className="space-y-4 border-l-2 border-primary/35 pl-4" role="region" aria-label="Site bilgileri">
              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-site`}>
                  Site adı <span className="text-error">*</span>
                </label>
                <input
                  id={`${base}-site`}
                  value={values.siteName}
                  onChange={(e) => onChange(patch(values, { siteName: e.target.value }))}
                  required={values.livesInSite}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-blok`}>
                  Blok <span className="text-error">*</span>
                </label>
                <input
                  id={`${base}-blok`}
                  value={values.block}
                  onChange={(e) => onChange(patch(values, { block: e.target.value }))}
                  required={values.livesInSite}
                  className={inputCls}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {locationSlot}

      {showOrderNote ? (
        <div>
          <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-note`}>
            Sipariş notu <span className="font-normal text-secondary/80">(mutfak)</span>
          </label>
          <textarea
            id={`${base}-note`}
            value={values.orderNote}
            onChange={(e) => onChange(patch(values, { orderNote: e.target.value }))}
            rows={3}
            placeholder="Örn. az acılı, soğansız, ekstra sos…"
            className={`${inputCls} resize-y`}
          />
        </div>
      ) : null}

      {showCourierNote ? (
        <div>
          <label className="block text-xs font-medium text-secondary" htmlFor={`${base}-courier-note`}>
            Kurye notu
          </label>
          <textarea
            id={`${base}-courier-note`}
            value={values.courierNote}
            onChange={(e) => onChange(patch(values, { courierNote: e.target.value }))}
            rows={3}
            placeholder="Örn. zil çalışmıyor, kapıcıya bırakın, arayın…"
            className={`${inputCls} resize-y`}
          />
          {addressMapSlot || locationSlot ? (
            <p className="mt-1 text-[11px] text-secondary">
              Kurye fişinde haritadaki konumun QR kodu zaten yer alır; buraya zil, kapı, kat gibi
              tarif bilgilerini yazın.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
