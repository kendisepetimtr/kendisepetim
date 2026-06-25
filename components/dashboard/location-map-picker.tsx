"use client";

import { DEFAULT_MAP_CENTER } from "@/lib/turkey-geography";
import type { GeoPoint } from "@/lib/geo";
import { MAX_DELIVERY_RADIUS_KM, MIN_DELIVERY_RADIUS_KM } from "@/lib/fulfillment";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type LocationMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number;
  showRadius?: boolean;
  onChange: (point: GeoPoint) => void;
};

function MapClickHandler({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationMapPicker({
  latitude,
  longitude,
  deliveryRadiusKm,
  showRadius = true,
  onChange,
}: LocationMapPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center = useMemo<GeoPoint>(() => {
    if (latitude != null && longitude != null) return { lat: latitude, lng: longitude };
    return { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng };
  }, [latitude, longitude]);

  const radiusMeters = Math.min(
    MAX_DELIVERY_RADIUS_KM,
    Math.max(MIN_DELIVERY_RADIUS_KM, deliveryRadiusKm),
  ) * 1000;

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-surface-container-highest bg-surface-container-low text-sm text-secondary">
        Harita yükleniyor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-container-highest">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={latitude != null && longitude != null ? 14 : 12}
        scrollWheelZoom
        className="h-64 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPick={onChange} />
        {latitude != null && longitude != null ? (
          <>
            <Marker position={[latitude, longitude]} icon={markerIcon} />
            {showRadius ? (
              <Circle
                center={[latitude, longitude]}
                radius={radiusMeters}
                pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12 }}
              />
            ) : null}
          </>
        ) : null}
      </MapContainer>
      <p className="border-t border-surface-container-highest bg-surface-container-low px-3 py-2 text-[11px] text-secondary">
        Haritaya tıklayarak restoran konumunu işaretleyin. Teslimat yarıçapı mavi daire ile gösterilir.
      </p>
    </div>
  );
}
