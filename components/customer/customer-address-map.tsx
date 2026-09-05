"use client";

/**
 * Adres girişinin tepesindeki harita bloğu — teslimat noktasının tek kaynağı.
 *
 * Neden böyle: eskiden müşteri adresi yazıyor, pini başka yere koyabiliyordu.
 * Fişte biri "ADRES", diğeri konum QR'ı olmak üzere çelişen iki hedef çıkıyor,
 * kurye hangisine gideceğini bilemiyordu. Artık mahalle ve sokak pinden
 * türetiliyor: iki farklı adres girmek yapısal olarak mümkün değil.
 *
 * Pin her oynadığında dış servise istek gitmesin diye çeviri geciktirilir.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CustomerGeoError,
  customerGeoErrorMessage,
  requestCustomerGeo,
} from "@/lib/customer-geo";
import { reverseGeocodeClient, type ResolvedAddress } from "@/lib/geocoding/client";
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

/** Pin sürüklenirken her karede istek atmamak için. */
const GEOCODE_DEBOUNCE_MS = 700;
/** Bu yarıçapın üstü kuryeyi yanlış sokağa gönderebilir. */
const COARSE_ACCURACY_M = 500;

type StatusTone = "ok" | "warn" | "error" | "info";
type Status = { tone: StatusTone; text: string };

const toneClass: Record<StatusTone, string> = {
  ok: "text-primary",
  warn: "text-on-background",
  error: "text-error",
  info: "text-secondary",
};

type CustomerAddressMapProps = {
  point: GeoPoint | null;
  /** Pin değişti — anında bildirilir. */
  onPointChange: (point: GeoPoint | null) => void;
  /** Adres çevirisi tamamlandı. `null` = metin alınamadı, pin yine geçerli. */
  onAddressResolved: (address: ResolvedAddress | null) => void;
  restaurant?: GeoPoint | null;
  radiusKm?: number | null;
  /** Dışarıdan gelen bilgi notu (ör. kayıtlı adresteki konum kullanılacak). */
  note?: string | null;
  title?: string;
  description?: string;
};

export default function CustomerAddressMap({
  point,
  onPointChange,
  onAddressResolved,
  restaurant = null,
  radiusKm = null,
  note = null,
  title = "Teslimat konumu",
  description = "Konumunuzu alın ya da haritadan işaretleyin. Mahalle ve sokak buradan belirlenir.",
}: CustomerAddressMapProps) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);

  // Callback kimliği her render değişebilir; efekt/zamanlayıcı eskiyi çağırmasın.
  const onAddressResolvedRef = useRef(onAddressResolved);
  useEffect(() => {
    onAddressResolvedRef.current = onAddressResolved;
  }, [onAddressResolved]);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Bileşen kapanırken bekleyen çeviri isteği ve zamanlayıcı iptal.
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  /** Pin yerleşti: önce üst bileşene haber ver, sonra gecikmeli olarak adrese çevir. */
  const applyPoint = useCallback(
    (next: GeoPoint) => {
      const normalized = normalizeGeoPoint(next);
      onPointChange(normalized);

      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();

      setGeocoding(true);
      const controller = new AbortController();
      abortRef.current = controller;

      debounceRef.current = window.setTimeout(() => {
        void (async () => {
          const address = await reverseGeocodeClient(
            normalized.lat,
            normalized.lng,
            controller.signal,
          );
          if (controller.signal.aborted) return;

          setGeocoding(false);
          setResolved(address);
          onAddressResolvedRef.current(address);

          if (!address) {
            setStatus({
              tone: "warn",
              text: "Bu nokta için adres bilgisi alınamadı. Pini yola daha yakın bir yere taşıyıp tekrar deneyin; mahalle ve sokağı elle de yazabilirsiniz.",
            });
          } else if (!address.street) {
            setStatus({
              tone: "warn",
              text: "Sokak adı bulunamadı — aşağıya elle yazın. Kurye zaten haritadaki pine gidecek.",
            });
          } else {
            setStatus(null);
          }
        })();
      }, GEOCODE_DEBOUNCE_MS);
    },
    [onPointChange],
  );

  const handleUseDeviceLocation = useCallback(async () => {
    setLocating(true);
    setStatus(null);
    try {
      const geo = await requestCustomerGeo();
      applyPoint({ lat: geo.lat, lng: geo.lng });

      if (geo.accuracyM != null && geo.accuracyM > COARSE_ACCURACY_M) {
        setStatus({
          tone: "warn",
          text: `Konum yaklaşık ${Math.round(geo.accuracyM)} m hassasiyetle alındı. Haritadan pini tam kapınıza taşıyın.`,
        });
      }
    } catch (error) {
      const code = error instanceof CustomerGeoError ? error.code : "unavailable";
      // Mesajlar zaten "haritadan işaretleyin" yönlendirmesini içeriyor; tekrar etmeyelim.
      setStatus({
        tone: "error",
        text: error instanceof CustomerGeoError ? error.message : customerGeoErrorMessage(code),
      });
    } finally {
      setLocating(false);
    }
  }, [applyPoint]);

  const outsideRadius =
    point != null &&
    restaurant != null &&
    radiusKm != null &&
    Number.isFinite(radiusKm) &&
    radiusKm > 0 &&
    distanceKm(restaurant, point) > radiusKm;

  const distanceLabel =
    point != null && restaurant != null ? formatDistanceKm(distanceKm(restaurant, point)) : null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-secondary">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-secondary">{description}</p>

      <div className="mt-3">
        <CustomerLocationPicker
          value={point}
          onChange={applyPoint}
          restaurant={restaurant}
          radiusKm={radiusKm}
        />
      </div>

      <button
        type="button"
        onClick={handleUseDeviceLocation}
        disabled={locating}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-3 text-sm font-bold text-primary hover:bg-primary/[0.08] disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[20px]">my_location</span>
        {locating ? "Konum alınıyor…" : point ? "Konumumu yeniden al" : "Konumumu al"}
      </button>

      {geocoding ? (
        <p className="mt-2 text-[11px] text-secondary">Adres bulunuyor…</p>
      ) : null}

      {status ? (
        <p className={`mt-2 text-[11px] leading-relaxed ${toneClass[status.tone]}`}>{status.text}</p>
      ) : null}

      {note ? <p className="mt-2 text-[11px] leading-relaxed text-secondary">{note}</p> : null}

      {point && resolved?.formatted ? (
        <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-secondary">
          <span className="font-semibold text-on-background">Seçilen nokta:</span>{" "}
          {resolved.formatted}
          {distanceLabel ? ` · İşletmeye ${distanceLabel}` : ""}
        </p>
      ) : null}

      {outsideRadius && radiusKm != null ? (
        <p className="mt-2 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[11px] leading-relaxed text-error">
          İşaretlediğiniz nokta teslimat alanının dışında (en fazla {radiusKm} km). Sipariş
          reddedilir — pini düzeltin veya gel-al seçeneğini kullanın.
        </p>
      ) : null}
    </div>
  );
}
