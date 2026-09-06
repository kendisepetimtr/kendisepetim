"use client";

import dynamic from "next/dynamic";
import type { MarketplaceSettingsPatch } from "@/lib/dashboard/marketplace-settings";
import MarketplaceProfileRing from "@/components/dashboard/marketplace-profile-ring";
import {
  resolveAutoCoverImageUrl,
  isPresetMarketplaceCoverUrl,
} from "@/lib/marketplace-cuisine-covers";
import {
  getMarketplaceChecklistStatus,
  type MarketplaceChecklistItem,
} from "@/lib/marketplace-profile-checklist";
import {
  CUISINE_TAG_OPTIONS,
  getMarketplaceDiscoverBlockers,
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
import LanguageAddStub from "@/components/dashboard/language-add-stub";
import { mergeDashboardTenantProfiles } from "@/lib/tenant-client-sync";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

const MAX_PUBLIC_DESCRIPTION_LENGTH = 280;

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
  onNavigateToTab?: (tab: string) => void;
};

export default function MarketplaceSettingsPanel({
  tenant,
  productCount,
  onTenantUpdate,
  persistSettingsToSupabase = false,
  onNavigateToTab,
}: MarketplaceSettingsPanelProps) {
  const [savePending, startSaveTransition] = useTransition();
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(tenant.marketplaceEnabled);
  const [city, setCity] = useState(tenant.city || LAUNCH_CITY);
  const [district, setDistrict] = useState(tenant.district || LAUNCH_DISTRICT);
  const [neighborhood, setNeighborhood] = useState(tenant.neighborhood);
  const [cuisineTags, setCuisineTags] = useState<string[]>(tenant.cuisineTags);
  const [coverImageUrl, setCoverImageUrl] = useState(
    () => resolveAutoCoverImageUrl(tenant.coverImageUrl, tenant.cuisineTags),
  );
  const [publicDescription, setPublicDescription] = useState(tenant.publicDescription);
  const [latitude, setLatitude] = useState<number | null>(tenant.latitude);
  const [longitude, setLongitude] = useState<number | null>(tenant.longitude);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(tenant.deliveryRadiusKm || DEFAULT_DELIVERY_RADIUS_KM);
  const [fulfillmentPickupEnabled, setFulfillmentPickupEnabled] = useState(tenant.fulfillmentPickupEnabled);
  const [fulfillmentDeliveryEnabled, setFulfillmentDeliveryEnabled] = useState(tenant.fulfillmentDeliveryEnabled);
  const [minOrderAmount, setMinOrderAmount] = useState(
    tenant.minOrderAmount != null ? String(tenant.minOrderAmount).replace(".", ",") : "",
  );
  const [orderEtaAutoEnabled, setOrderEtaAutoEnabled] = useState(tenant.orderEtaAutoEnabled === true);
  const [orderEtaMode, setOrderEtaMode] = useState<"total" | "stages">(
    tenant.orderEtaMode === "stages" ? "stages" : "total",
  );
  const [orderEtaTotalMinutes, setOrderEtaTotalMinutes] = useState(String(tenant.orderEtaTotalMinutes ?? 15));
  const [orderEtaPrepMinutes, setOrderEtaPrepMinutes] = useState(String(tenant.orderEtaPrepMinutes ?? 10));
  const [orderEtaReadyMinutes, setOrderEtaReadyMinutes] = useState(String(tenant.orderEtaReadyMinutes ?? 12));
  const [orderEtaDispatchMinutes, setOrderEtaDispatchMinutes] = useState(
    String(tenant.orderEtaDispatchMinutes ?? 15),
  );
  const [orderEtaDeliverMinutes, setOrderEtaDeliverMinutes] = useState(
    String(tenant.orderEtaDeliverMinutes ?? 30),
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const coverIsCustom = useMemo(
    () => coverImageUrl.trim().length > 0 && !isPresetMarketplaceCoverUrl(coverImageUrl),
    [coverImageUrl],
  );

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
      coverImageUrl,
      logoUrl: tenant.logoDataUrl,
      publicDescription,
      publicMenuEnabled: tenant.publicMenuEnabled,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      productCount,
      openTime: tenant.openTime,
      closeTime: tenant.closeTime,
    }),
    [
      marketplaceEnabled,
      city,
      district,
      neighborhood,
      cuisineTags,
      latitude,
      longitude,
      coverImageUrl,
      tenant.logoDataUrl,
      publicDescription,
      tenant.publicMenuEnabled,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      productCount,
      tenant.openTime,
      tenant.closeTime,
    ],
  );

  const checklistStatus = useMemo(() => getMarketplaceChecklistStatus(profilePreview), [profilePreview]);
  const qualityIssues = useMemo(() => getMarketplaceQualityIssues(profilePreview), [profilePreview]);
  const canPublish = qualityIssues.length === 0;
  const incompleteItems = checklistStatus.items.filter((i) => !i.complete);
  const discoverBlockers = getMarketplaceDiscoverBlockers({
    qualityIssues,
    marketplaceEnabled,
    vitrinApproved: tenant.marketplaceVitrinApproved,
    applicationApproved: true,
  });

  useEffect(() => {
    setMarketplaceEnabled(tenant.marketplaceEnabled);
    setCity(tenant.city || LAUNCH_CITY);
    setDistrict(tenant.district || LAUNCH_DISTRICT);
    setNeighborhood(tenant.neighborhood);
    setCuisineTags(tenant.cuisineTags);
    setCoverImageUrl(resolveAutoCoverImageUrl(tenant.coverImageUrl, tenant.cuisineTags));
    setPublicDescription(tenant.publicDescription);
    setLatitude(tenant.latitude);
    setLongitude(tenant.longitude);
    setDeliveryRadiusKm(tenant.deliveryRadiusKm || DEFAULT_DELIVERY_RADIUS_KM);
    setFulfillmentPickupEnabled(tenant.fulfillmentPickupEnabled);
    setFulfillmentDeliveryEnabled(tenant.fulfillmentDeliveryEnabled);
    setMinOrderAmount(
      tenant.minOrderAmount != null ? String(tenant.minOrderAmount).replace(".", ",") : "",
    );
    setOrderEtaAutoEnabled(tenant.orderEtaAutoEnabled === true);
    setOrderEtaMode(tenant.orderEtaMode === "stages" ? "stages" : "total");
    setOrderEtaTotalMinutes(String(tenant.orderEtaTotalMinutes ?? 15));
    setOrderEtaPrepMinutes(String(tenant.orderEtaPrepMinutes ?? 10));
    setOrderEtaReadyMinutes(String(tenant.orderEtaReadyMinutes ?? 12));
    setOrderEtaDispatchMinutes(String(tenant.orderEtaDispatchMinutes ?? 15));
    setOrderEtaDeliverMinutes(String(tenant.orderEtaDeliverMinutes ?? 30));
  }, [tenant]);

  function toggleCuisineTag(tag: string) {
    setCuisineTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      setCoverImageUrl((current) => resolveAutoCoverImageUrl(current, next));
      return next;
    });
  }

  function handleChecklistActivate(item: MarketplaceChecklistItem & { complete: boolean }) {
    if (item.target === "in-panel" && item.anchorId) {
      document.getElementById(item.anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (item.navTab && onNavigateToTab) {
      onNavigateToTab(item.navTab);
    }
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
      coverImageUrl,
      publicDescription: publicDescription.trim(),
      latitude,
      longitude,
      deliveryRadiusKm,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      minOrderAmount: parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null,
      orderEtaAutoEnabled,
      orderEtaMode,
      orderEtaTotalMinutes: Number(orderEtaTotalMinutes) || 15,
      orderEtaPrepMinutes: Number(orderEtaPrepMinutes) || 10,
      orderEtaReadyMinutes: Number(orderEtaReadyMinutes) || 12,
      orderEtaDispatchMinutes: Number(orderEtaDispatchMinutes) || 15,
      orderEtaDeliverMinutes: Number(orderEtaDeliverMinutes) || 30,
    };

    if (!persistSettingsToSupabase) {
      saveLocalTenant(next);
      onTenantUpdate(next);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
      return;
    }

    const patch: MarketplaceSettingsPatch = {
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
      coverImageUrl,
      publicDescription: publicDescription.trim(),
      orderEtaAutoEnabled,
      orderEtaMode,
      orderEtaTotalMinutes: Number(orderEtaTotalMinutes) || 15,
      orderEtaPrepMinutes: Number(orderEtaPrepMinutes) || 10,
      orderEtaReadyMinutes: Number(orderEtaReadyMinutes) || 12,
      orderEtaDispatchMinutes: Number(orderEtaDispatchMinutes) || 15,
      orderEtaDeliverMinutes: Number(orderEtaDeliverMinutes) || 30,
    };

    startSaveTransition(async () => {
      try {
        const res = await fetch("/api/dashboard/marketplace", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const result = (await res.json()) as
          | { ok: true; profile: LocalTenantProfile }
          | { ok: false; error: string };
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        const merged = mergeDashboardTenantProfiles(tenant, result.profile);
        saveLocalTenant(merged);
        onTenantUpdate(merged);
        setMarketplaceEnabled(merged.marketplaceEnabled);
        setCoverImageUrl(merged.coverImageUrl);
        setPublicDescription(merged.publicDescription);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2500);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Kayıt güncellenemedi.");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <section className="rounded-2xl border border-surface-container-highest bg-gradient-to-b from-surface-container-lowest to-surface-container-low/30 p-5 shadow-sm sm:p-8">
        <MarketplaceProfileRing
          logoUrl={tenant.logoDataUrl}
          businessName={tenant.businessName}
          items={checklistStatus.items}
          completedCount={checklistStatus.completedCount}
          totalCount={checklistStatus.totalCount}
          onItemActivate={handleChecklistActivate}
        />

        {incompleteItems.length > 0 ? (
          <div className="mx-auto mt-6 max-w-lg rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
            <p className="text-center text-xs font-semibold text-amber-950">Eksik adımlar — tıklayarak ilgili alana gidin</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {incompleteItems.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleChecklistActivate(item)}
                    className="rounded-full border border-amber-500/40 bg-white px-3 py-1 text-[11px] font-medium text-amber-900 transition hover:bg-amber-50"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-600/25 bg-emerald-600/5 px-4 py-3 text-center text-sm font-medium text-emerald-900">
            Tüm adımlar tamam — marketplace&apos;te yayınlayabilirsiniz.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-lg font-bold text-on-background">Marketplace profili</h2>
        <p className="mt-1 text-sm text-secondary">
          {LAUNCH_CITY} / {LAUNCH_DISTRICT} lansman bölgesi.
        </p>

        <div id="marketplace-cuisine" className="mt-5 scroll-mt-24">
          <p className="text-xs font-medium text-secondary">Mutfak türü</p>
          <p className="mt-0.5 text-[11px] text-secondary">
            Seçtiğiniz türe göre kapak görseli otomatik atanır
            {coverIsCustom ? " (özel kapak korunur)" : ""}.
          </p>
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

        <div id="marketplace-cover" className="mt-5 scroll-mt-24">
          <p className="text-xs font-medium text-secondary">Kapak önizleme</p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-low">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="aspect-[16/7] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/7] items-center justify-center text-sm text-secondary">
                Mutfak türü seçince kapak görseli atanır
              </div>
            )}
          </div>
          {coverIsCustom ? (
            <p className="mt-1.5 text-[11px] text-secondary">
              Özel kapak yüklü — mutfak değişince güncellenmez.{" "}
              {onNavigateToTab ? (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("settings")}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Ayarlar&apos;dan değiştir
                </button>
              ) : null}
            </p>
          ) : null}
        </div>

        <div id="marketplace-description" className="mt-5 scroll-mt-24">
          <label className="block text-xs font-medium text-secondary" htmlFor="marketplace-description-input">
            Restoran açıklaması
          </label>
          <textarea
            id="marketplace-description-input"
            value={publicDescription}
            onChange={(e) => setPublicDescription(e.target.value.slice(0, MAX_PUBLIC_DESCRIPTION_LENGTH))}
            rows={3}
            placeholder="Restoranlar ve ana sayfada görünecek kısa tanıtım…"
            className="mt-1 w-full resize-y rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-[11px] text-secondary">
            {publicDescription.length}/{MAX_PUBLIC_DESCRIPTION_LENGTH}
          </p>
          <LanguageAddStub />
        </div>

        <div id="marketplace-location-fields" className="mt-5 grid scroll-mt-24 gap-4 sm:grid-cols-3">
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
      </section>

      <section
        id="marketplace-map"
        className="scroll-mt-24 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6"
      >
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

      <section
        id="marketplace-fulfillment"
        className="scroll-mt-24 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6"
      >
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
              <p className="mt-1 text-[11px] text-secondary">
                {MIN_DELIVERY_RADIUS_KM}–{MAX_DELIVERY_RADIUS_KM} km
              </p>
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

        <div className="mt-8 rounded-2xl border border-surface-container-highest bg-surface-container-low/40 p-4">
          <p className="text-sm font-bold text-on-background">Sipariş süreleri ve otomatik bildirim</p>
          <p className="mt-1 text-xs text-secondary">
            Dakika cinsinden. Otomatik açıksa müşteriye planlı bildirim gider (Alındı → Hazırlanıyor / Yolda…).
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={orderEtaAutoEnabled}
              onChange={(e) => setOrderEtaAutoEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary"
            />
            <span className="text-sm font-medium text-on-background">Otomatik müşteri bildirimi</span>
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-secondary">
              Mod
              <select
                value={orderEtaMode}
                onChange={(e) => setOrderEtaMode(e.target.value === "stages" ? "stages" : "total")}
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
              >
                <option value="total">Toplam süre (ör. 15 dk sonra yolda)</option>
                <option value="stages">Aşamalı süreler</option>
              </select>
            </label>
            {orderEtaMode === "total" ? (
              <label className="text-xs font-medium text-secondary">
                Toplam (dk)
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={orderEtaTotalMinutes}
                  onChange={(e) => setOrderEtaTotalMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                />
              </label>
            ) : (
              <>
                <label className="text-xs font-medium text-secondary">
                  Hazırlanıyor (dk)
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={orderEtaPrepMinutes}
                    onChange={(e) => setOrderEtaPrepMinutes(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-secondary">
                  Hazır (dk)
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={orderEtaReadyMinutes}
                    onChange={(e) => setOrderEtaReadyMinutes(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-secondary">
                  Yola çıktı (dk)
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={orderEtaDispatchMinutes}
                    onChange={(e) => setOrderEtaDispatchMinutes(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-secondary">
                  Teslim (dk)
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={orderEtaDeliverMinutes}
                    onChange={(e) => setOrderEtaDeliverMinutes(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-high bg-surface-container-low/40 p-4">
          <input
            type="checkbox"
            checked={marketplaceEnabled}
            onChange={(e) => setMarketplaceEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
          />
          <span>
            <span className="block text-sm font-semibold text-on-background">Marketplace&apos;te yayınla</span>
            <span className="mt-0.5 block text-xs text-secondary">
              Açıkken keşif için aday olursunuz. Listede görünmek için superadmin vitrin onayı da gerekir. QR menü
              bundan bağımsız çalışır.
            </span>
            {marketplaceEnabled && !canPublish ? (
              <span className="mt-2 block text-xs font-medium text-amber-800">
                Kaydetmeden önce profil adımlarını tamamlayın.
              </span>
            ) : null}
            {discoverBlockers.length > 0 ? (
              <span className="mt-2 block text-xs font-medium text-amber-900">
                Keşifte değilsiniz çünkü: {discoverBlockers.map((b) => b.label).join(", ")}.
              </span>
            ) : (
              <span className="mt-2 block text-xs font-medium text-emerald-800">Keşif vitrininde görünüyorsunuz.</span>
            )}
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
