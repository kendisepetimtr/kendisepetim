"use client";

/**
 * Teslimat konumu alanı — "Konum al" + haritadan işaretleme birlikte.
 *
 * Tasarım kararı: konum artık tek bir yola bağlı değil. Tarayıcı konumu
 * vermezse (iOS izin durumu, kapalı konum servisi, https dışı bağlam)
 * harita kendiliğinden açılır ve kullanıcı pini elle koyar. Böylece paket
 * sipariş hiçbir cihaz/izin durumunda tıkanmaz.
 */

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import {
  CustomerGeoError,
  customerGeoErrorMessage,
  requestCustomerGeo,
} from "@/lib/customer-geo";
import { distanceKm, formatDistanceKm, normalizeGeoPoint, type GeoPoint } from "@/lib/geo";

const CustomerLocationPicker = dynamic(
  () => import("@/components/customer/customer-location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-surface-container-highest bg-surface-container-low text-sm text-secondary">
        Harita yükleniyor…
      </div>
    ),
  },
);

/** Bu yarıçapın üstündeki sonuç kuryeyi yanlış sokağa gönderebilir — haritadan doğrulatırız. */
const COARSE_ACCURACY_M = 500;

type StatusTone = "ok" | "warn" | "error";

type Status = { tone: StatusTone; text: string };

type CustomerLocationFieldProps = {
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
  /** İşletme konumu — teslimat dairesi ve mesafe uyarısı için. */
  restaurant?: GeoPoint | null;
  restaurantLogoUrl?: string | null;
  radiusKm?: number | null;
  /** Dışarıdan gelen bilgi notu (ör. kayıtlı adresteki konum kullanılacak). */
  note?: string | null;
  title?: string;
  description?: string;
};

const toneClass: Record<StatusTone, string> = {
  ok: "text-primary",
  warn: "text-on-background",
  error: "text-error",
};

export default function CustomerLocationField({
  value,
  onChange,
  restaurant = null,
  restaurantLogoUrl = null,
  radiusKm = null,
  note = null,
  title = "Teslimat konumu",
  description = "Kuryenin adresi bulabilmesi için tam noktanızı işaretleyin.",
}: CustomerLocationFieldProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const handleUseDeviceLocation = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const geo = await requestCustomerGeo();
      onChange(normalizeGeoPoint({ lat: geo.lat, lng: geo.lng }));

      if (geo.accuracyM != null && geo.accuracyM > COARSE_ACCURACY_M) {
        // Hücre/wifi tabanlı kaba sonuç: kabul et ama haritadan doğrulat.
        setMapOpen(true);
        setStatus({
          tone: "warn",
          text: `Konum yaklaşık ${Math.round(geo.accuracyM)} m hassasiyetle alındı. Haritadan tam noktayı işaretlemeniz kuryeye yardımcı olur.`,
        });
      } else {
        setStatus({ tone: "ok", text: "Konum alındı. Teslimat mesafesi siparişte doğrulanır." });
      }
    } catch (error) {
      const code = error instanceof CustomerGeoError ? error.code : "unavailable";
      // Konum gelmedi diye sipariş tıkanmasın: haritayı hemen aç.
      setMapOpen(true);
      setStatus({
        tone: "error",
        text: error instanceof CustomerGeoError ? error.message : customerGeoErrorMessage(code),
      });
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  const handleMapPick = useCallback(
    (point: GeoPoint) => {
      onChange(point);
      setStatus({ tone: "ok", text: "Konum haritadan işaretlendi." });
    },
    [onChange],
  );

  const outsideRadius =
    value != null &&
    restaurant != null &&
    radiusKm != null &&
    Number.isFinite(radiusKm) &&
    radiusKm > 0 &&
    distanceKm(restaurant, value) > radiusKm;

  const distanceLabel =
    value != null && restaurant != null ? formatDistanceKm(distanceKm(restaurant, value)) : null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-secondary">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-secondary">{description}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleUseDeviceLocation}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/[0.08] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">my_location</span>
          {busy ? "Konum alınıyor…" : value ? "Konumumu yeniden al" : "Konum al"}
        </button>
        <button
          type="button"
          onClick={() => setMapOpen((open) => !open)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-xs font-bold text-on-background hover:bg-surface-container-low"
          aria-expanded={mapOpen}
        >
          <span className="material-symbols-outlined text-[18px]">map</span>
          {mapOpen ? "Haritayı kapat" : "Haritadan seç"}
        </button>
      </div>

      {status ? (
        <p className={`mt-2 text-[11px] leading-relaxed ${toneClass[status.tone]}`}>{status.text}</p>
      ) : null}

      {note ? <p className="mt-2 text-[11px] leading-relaxed text-secondary">{note}</p> : null}

      {mapOpen ? (
        <div className="mt-3">
          <CustomerLocationPicker
            value={value}
            onChange={handleMapPick}
            restaurant={restaurant}
            restaurantLogoUrl={restaurantLogoUrl}
            radiusKm={radiusKm}
          />
        </div>
      ) : null}

      {value ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-secondary">
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Konum hazır
          </span>
          <span>
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
          {distanceLabel ? <span>İşletmeye {distanceLabel}</span> : null}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setStatus(null);
            }}
            className="ml-auto font-semibold text-secondary underline underline-offset-2 hover:text-on-background"
          >
            Temizle
          </button>
        </div>
      ) : null}

      {outsideRadius && radiusKm != null ? (
        <p className="mt-2 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[11px] leading-relaxed text-error">
          İşaretlediğiniz nokta teslimat alanının dışında (en fazla {radiusKm} km). Sipariş
          reddedilir — noktayı düzeltin veya gel-al seçeneğini kullanın.
        </p>
      ) : null}
    </div>
  );
}
