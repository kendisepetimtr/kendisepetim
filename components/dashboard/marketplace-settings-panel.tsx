"use client";

import dynamic from "next/dynamic";
import { updateMarketplaceSettingsAction } from "@/app/dashboard/marketplace-settings-actions";
import {
  CUISINE_TAG_OPTIONS,
  getMarketplaceQualityIssues,
  type MarketplaceProfileInput,
} from "@/lib/marketplace";
import {
  DEFAULT_DELIVERY_RADIUS_KM,
  MAX_DELIVERY_RADIUS_KM,
  MIN_DELIVERY_RADIUS_KM,
} from "@/lib/fulfillment";
import { LAUNCH_CITY, LAUNCH_DISTRICT, getLaunchCities, getNeighborhoodsForDistrict } from "@/lib/turkey-geography";
import { saveLocalTenant, type LocalTenantProfile } from "@/lib/local-tenant";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

const LocationMapPicker = dynamic(() => import("@/components/dashboard/location-map-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-surface-container-highest bg-surface-container-low text-sm text-secondary">
      Harita yükleniyor…
    </div>
  ),
});

type MarketplaceSettingsPanelProps = {
  tenant: LocalTenantProfile;
  productCount: number;
  onTenantUpdate: (tenant: LocalTenantProfile) => void;
  persistSettingsToSupabase?: boolean;
};

export default function MarketplaceSettingsPanel({
  tenant,
  productCount,
  onTenantUpdate,
  persistSettingsToSupabase = false,
}: MarketplaceSettingsPanelProps) {
  const [savePending, startSaveTransition] = useTransition();
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(tenant.marketplaceEnabled);
  const [city, setCity] = useState(tenant.city || LAUNCH_CITY);
  const [district, setDistrict] = useState(tenant.district || LAUNCH_DISTRICT);
  const [neighborhood, setNeighborhood] = useState(tenant.neighborhood);
  const [cuisineTags, setCuisineTags] = useState<string[]>(tenant.cuisineTags);
  const [latitude, setLatitude] = useState<number | null>(tenant.latitude);
  const [longitude, setLongitude] = useState<number | null>(tenant.longitude);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(tenant.deliveryRadiusKm || DEFAULT_DELIVERY_RADIUS_KM);
  const [fulfillmentPickupEnabled, setFulfillmentPickupEnabled] = useState(tenant.fulfillmentPickupEnabled);
  const [fulfillmentDeliveryEnabled, setFulfillmentDeliveryEnabled] = useState(tenant.fulfillmentDeliveryEnabled);
  const [minOrderAmount, setMinOrderAmount] = useState(
    tenant.minOrderAmount != null ? String(tenant.minOrderAmount).replace(".", ",") : "",
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const neighborhoods = useMemo(
    () => getNeighborhoodsForDistrict(city, district),
    [city, district],
  );

  const profilePreview: MarketplaceProfileInput = useMemo(
    () => ({
      marketplaceEnabled,
      city,
      district,
      neighborhood,
      cuisineTags,
      latitude,
      longitude,
      coverImageUrl: tenant.coverImageUrl,
      logoUrl: tenant.logoDataUrl,
      publicDescription: tenant.publicDescription,
      publicMenuEnabled: tenant.publicMenuEnabled,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      productCount,
    }),
    [
      marketplaceEnabled,
      city,
      district,
      neighborhood,
      cuisineTags,
      latitude,
      longitude,
      tenant.coverImageUrl,
      tenant.logoDataUrl,
      tenant.publicDescription,
      tenant.publicMenuEnabled,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      productCount,
    ],
  );

  const qualityIssues = useMemo(() => getMarketplaceQualityIssues(profilePreview), [profilePreview]);
  const canPublish = qualityIssues.length === 0;

  useEffect(() => {
    setMarketplaceEnabled(tenant.marketplaceEnabled);
    setCity(tenant.city || LAUNCH_CITY);
    setDistrict(tenant.district || LAUNCH_DISTRICT);
    setNeighborhood(tenant.neighborhood);
    setCuisineTags(tenant.cuisineTags);
    setLatitude(tenant.latitude);
    setLongitude(tenant.longitude);
    setDeliveryRadiusKm(tenant.deliveryRadiusKm || DEFAULT_DELIVERY_RADIUS_KM);
    setFulfillmentPickupEnabled(tenant.fulfillmentPickupEnabled);
    setFulfillmentDeliveryEnabled(tenant.fulfillmentDeliveryEnabled);
    setMinOrderAmount(
      tenant.minOrderAmount != null ? String(tenant.minOrderAmount).replace(".", ",") : "",
    );
  }, [tenant]);

  function toggleCuisineTag(tag: string) {
    setCuisineTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!fulfillmentPickupEnabled && !fulfillmentDeliveryEnabled) {
      window.alert("En az gel-al veya restoran teslimatı seçeneğini açmalısınız.");
      return;
    }
    if (latitude == null || longitude == null) {
      window.alert("Haritadan restoran konumunu işaretleyin.");
      return;
    }
    if (marketplaceEnabled && !canPublish) {
      window.alert(`Marketplace için eksikler: ${qualityIssues.map((i) => i.label).join(", ")}`);
      return;
    }

    const parsedMin =
      minOrderAmount.trim() === "" ? null : Number(minOrderAmount.replace(",", ".").replace(/[^\d.]/g, ""));

    const next: LocalTenantProfile = {
      ...tenant,
      marketplaceEnabled,
      city,
      district,
      neighborhood,
      cuisineTags,
      latitude,
      longitude,
      deliveryRadiusKm,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      minOrderAmount: parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null,
    };

    if (!persistSettingsToSupabase) {
      saveLocalTenant(next);
      onTenantUpdate(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      return;
    }

    startSaveTransition(async () => {
      try {
        const result = await updateMarketplaceSettingsAction({
          marketplaceEnabled,
          city,
          district,
          neighborhood,
          cuisineTags,
          latitude,
          longitude,
          deliveryRadiusKm,
          fulfillmentPickupEnabled,
          fulfillmentDeliveryEnabled,
          minOrderAmount: parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null,
        });
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        onTenantUpdate(result.profile);
        setMarketplaceEnabled(result.profile.marketplaceEnabled);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2500);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Kayıt güncellenemedi.");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-lg font-bold text-on-background">Sipariş & teslimat</h2>
        <p className="mt-1 text-sm text-secondary">
          Gel-al ve restoran teslimatı seçeneklerini yönetin. Teslimat yarıçapı restoran konumundan hesaplanır.
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
            <input
              type="checkbox"
              checked={fulfillmentPickupEnabled}
              onChange={(e) => setFulfillmentPickupEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span>
              <span className="block text-sm font-medium text-on-background">Gel-al</span>
              <span className="mt-0.5 block text-xs text-secondary">Müşteri restorandan alır; fiyat normal (price) olur.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 hover:bg-white/60">
            <input
              type="checkbox"
              checked={fulfillmentDeliveryEnabled}
              onChange={(e) => setFulfillmentDeliveryEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span>
              <span className="block text-sm font-medium text-on-background">Restoran teslimatı</span>
              <span className="mt-0.5 block text-xs text-secondary">
                Teslimat fiyatı paket fiyat mantığıyla uygulanır; yarıçap içinde sipariş alınır.
              </span>
            </span>
          </label>
        </div>

        {fulfillmentDeliveryEnabled ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor="delivery-radius">
                Teslimat yarıçapı (km)
              </label>
              <input
                id="delivery-radius"
                type="number"
                min={MIN_DELIVERY_RADIUS_KM}
                max={MAX_DELIVERY_RADIUS_KM}
                step={0.5}
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-[11px] text-secondary">{MIN_DELIVERY_RADIUS_KM}–{MAX_DELIVERY_RADIUS_KM} km</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary" htmlFor="min-order">
                Minimum sipariş (₺, opsiyonel)
              </label>
              <input
                id="min-order"
                type="text"
                inputMode="decimal"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="Örn. 150"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-lg font-bold text-on-background">Restoran konumu</h2>
        <p className="mt-1 text-sm text-secondary">OpenStreetMap üzerinde pin bırakın. Teslimat mesafesi bu noktadan ölçülür.</p>
        <div className="mt-4">
          <LocationMapPicker
            latitude={latitude}
            longitude={longitude}
            deliveryRadiusKm={deliveryRadiusKm}
            showRadius={fulfillmentDeliveryEnabled}
            onChange={({ lat, lng }) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-lg font-bold text-on-background">Marketplace profili</h2>
        <p className="mt-1 text-sm text-secondary">
          {LAUNCH_CITY} / {LAUNCH_DISTRICT} lansman bölgesi. Profil tamamlanınca marketplace&apos;te yayınlayabilirsiniz.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-secondary">İl</label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setNeighborhood("");
              }}
              className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
            >
              {getLaunchCities().map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary">İlçe</label>
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setNeighborhood("");
              }}
              className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
            >
              <option value={LAUNCH_DISTRICT}>{LAUNCH_DISTRICT}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary">Mahalle</label>
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
              required
            >
              <option value="">Mahalle seçin</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-secondary">Mutfak türü</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUISINE_TAG_OPTIONS.map((tag) => {
              const active = cuisineTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleCuisineTag(tag)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "border border-surface-container-highest bg-white text-secondary hover:text-on-background",
                  ].join(" ")}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {qualityIssues.length > 0 ? (
          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Marketplace için eksikler</p>
            <ul className="mt-2 list-inside list-disc text-xs">
              {qualityIssues.map((issue) => (
                <li key={issue.key}>{issue.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-emerald-600/20 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-900">
            Profil marketplace için hazır.
          </p>
        )}

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-high bg-surface-container-low/40 p-4">
          <input
            type="checkbox"
            checked={marketplaceEnabled}
            onChange={(e) => setMarketplaceEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
          />
          <span>
            <span className="block text-sm font-semibold text-on-background">Marketplace&apos;te yayınla</span>
            <span className="mt-0.5 block text-xs text-secondary">
              Açıkken restoranınız Keşfet ve ana sayfada listelenir. Kapatmak için işareti kaldırın.
            </span>
            {marketplaceEnabled && !canPublish ? (
              <span className="mt-2 block text-xs font-medium text-amber-800">
                Kaydetmeden önce yukarıdaki eksikleri tamamlayın.
              </span>
            ) : null}
            {!marketplaceEnabled && !canPublish ? (
              <span className="mt-2 block text-xs text-secondary">
                İşaretleyip kaydetmeden önce eksikleri tamamlamanız gerekir.
              </span>
            ) : null}
          </span>
        </label>
      </section>

      {saveError ? (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error whitespace-pre-wrap">
          {saveError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={savePending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container disabled:opacity-60"
        >
          {savePending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {savedFlash ? <span className="text-sm font-medium text-emerald-700">Kaydedildi.</span> : null}
      </div>
    </form>
  );
}
