"use client";

/**
 * Müşterinin teslimat noktasını haritadan işaretlemesi.
 *
 * GPS'e alternatif değil, kaçış yoludur: tarayıcı konumu vermediğinde
 * (iOS'ta izin durumu, kapalı konum servisi, sinyalsiz ortam) sipariş
 * tıkanmasın diye kullanıcı pini elle koyabilir. Sunucudaki yarıçap
 * doğrulaması aynen çalışır — sadece koordinatın kaynağı değişir.
 *
 * ssr: false ile yükleyin; Leaflet tarayıcı API'lerine bağlıdır.
 */

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { normalizeGeoPoint, type GeoPoint } from "@/lib/geo";
import { customerPinIcon, restaurantMarkerIcon } from "@/lib/leaflet-icons";
import { DEFAULT_MAP_CENTER } from "@/lib/turkey-geography";

type CustomerLocationPickerProps = {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** İşletme konumu — teslimat dairesiyle birlikte gösterilir. */
  restaurant?: GeoPoint | null;
  /** Haritada restoran pini yerine logo. */
  restaurantLogoUrl?: string | null;
  radiusKm?: number | null;
  /** Yükseklik sınıfı; dar modallarda kısaltmak için. */
  heightClass?: string;
};

function toPoint(latlng: L.LatLng): GeoPoint {
  const wrapped = latlng.wrap();
  return normalizeGeoPoint({ lat: wrapped.lat, lng: wrapped.lng });
}

function ClickToPlace({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      onPick(toPoint(event.latlng));
    },
  });
  return null;
}

/**
 * Modal içinde açılan harita, kapalıyken ölçüsü 0 olduğu için gri kalır.
 * Görünür olunca ve her yeniden boyutlanmada Leaflet'e ölçüyü yeniden okutuyoruz.
 */
function KeepSizeCorrect() {
  const map = useMap();

  useEffect(() => {
    const fix = () => map.invalidateSize();
    const immediate = window.setTimeout(fix, 0);
    const afterTransition = window.setTimeout(fix, 300);

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fix) : null;
    observer?.observe(map.getContainer());

    return () => {
      window.clearTimeout(immediate);
      window.clearTimeout(afterTransition);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

/**
 * Haritayı kaydırıp pini ekrandan kaçıran kullanıcıyı geri getirir.
 * Sürüklemek isterken haritayı kaydırmak çok kolay; bu düğme olmadan
 * kullanıcı işaretlediği noktayı bir daha bulamıyordu.
 */
function RecenterButton({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element) return;
    /*
     * Leaflet tıklama dinleyicisini doğrudan harita kabına takıyor; React'in
     * sentetik olayları kökte toplandığı için stopPropagation Leaflet'e geç
     * kalıyor ve düğmeye basmak "haritaya tıklama" sayılıp pini oraya taşıyordu.
     * Leaflet'in kendi yardımcısı native seviyede durduruyor.
     */
    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.disableScrollPropagation(element);
  }, [point]);

  if (!point) return null;

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={() => {
        map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16), { animate: true });
      }}
      className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1 rounded-lg border border-surface-container-highest bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-on-background shadow-sm hover:bg-white"
    >
      <span className="material-symbols-outlined text-[14px]">my_location</span>
      Pine dön
    </button>
  );
}

/** Konum dışarıdan gelirse (GPS) haritayı oraya taşı — kullanıcı sürüklerken karışma. */
function FollowExternalChanges({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!point) return;
    const key = `${point.lat},${point.lng}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const target = L.latLng(point.lat, point.lng);
    if (!map.getBounds().contains(target)) {
      map.setView(target, Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [map, point]);

  return null;
}

export default function CustomerLocationPicker({
  value,
  onChange,
  restaurant = null,
  restaurantLogoUrl = null,
  radiusKm = null,
  heightClass = "h-72",
}: CustomerLocationPickerProps) {
  const center = useMemo<GeoPoint>(() => {
    if (value) return value;
    if (restaurant) return restaurant;
    return { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng };
  }, [value, restaurant]);

  const initialZoom = value ? 16 : restaurant ? 14 : 12;
  const radiusMeters =
    restaurant && radiusKm != null && Number.isFinite(radiusKm) && radiusKm > 0
      ? radiusKm * 1000
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-container-highest">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={initialZoom}
        scrollWheelZoom={false}
        className={`${heightClass} w-full`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <KeepSizeCorrect />
        <FollowExternalChanges point={value} />
        <ClickToPlace onPick={onChange} />
        <RecenterButton point={value} />

        {restaurant ? (
          <>
            <Marker
              position={[restaurant.lat, restaurant.lng]}
              icon={restaurantMarkerIcon(restaurantLogoUrl)}
              zIndexOffset={-200}
            />
            {radiusMeters != null ? (
              <Circle
                center={[restaurant.lat, restaurant.lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: "#2563eb",
                  weight: 1.5,
                  fillColor: "#2563eb",
                  fillOpacity: 0.08,
                }}
              />
            ) : null}
          </>
        ) : null}

        {value ? (
          <Marker
            position={[value.lat, value.lng]}
            icon={customerPinIcon()}
            draggable
            autoPan
            eventHandlers={{
              dragend: (event) => {
                onChange(toPoint((event.target as L.Marker).getLatLng()));
              },
            }}
          />
        ) : null}
      </MapContainer>

      <p className="border-t border-surface-container-highest bg-surface-container-low px-3 py-2 text-[11px] leading-relaxed text-secondary">
        {value
          ? "Noktayı düzeltmek için haritada doğru yere dokunun; pini sürükleyerek de taşıyabilirsiniz."
          : "Teslimat adresinizi haritada bulup dokunun; kırmızı pin oraya yerleşir."}
        {restaurant ? " Daire teslimat alanı, logo restoranın yeridir." : ""}
      </p>
    </div>
  );
}
