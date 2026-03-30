"use client";

import { useEffect, useState } from "react";

type Props = {
  defaultCallEnabled: boolean;
  defaultCallPhone: string | null;
  defaultWhatsappEnabled: boolean;
  defaultWhatsappPhone: string | null;
  defaultLocationEnabled: boolean;
  defaultLocationLat: number | null;
  defaultLocationLng: number | null;
};

export function RestaurantContactControls({
  defaultCallEnabled,
  defaultCallPhone,
  defaultWhatsappEnabled,
  defaultWhatsappPhone,
  defaultLocationEnabled,
  defaultLocationLat,
  defaultLocationLng,
}: Props) {
  const [callEnabled, setCallEnabled] = useState(defaultCallEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(defaultWhatsappEnabled);
  const [locationEnabled, setLocationEnabled] = useState(defaultLocationEnabled);
  const [callPhone, setCallPhone] = useState(defaultCallPhone ?? "");
  const [whatsappPhone, setWhatsappPhone] = useState(defaultWhatsappPhone ?? "");
  const [lat, setLat] = useState(defaultLocationLat != null ? String(defaultLocationLat) : "");
  const [lng, setLng] = useState(defaultLocationLng != null ? String(defaultLocationLng) : "");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    if (!locationEnabled) {
      setGeoError(null);
      return;
    }
    if (lat && lng) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Bu tarayıcı konum bilgisini desteklemiyor.");
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setGeoError(null);
        setLoadingGeo(false);
      },
      () => {
        setGeoError("Konum izni verilmedi veya alınamadı. Tekrar deneyin.");
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locationEnabled, lat, lng]);

  return (
    <div className="md:col-span-2 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-800">FAB İletişim Butonları</p>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="fab_call_enabled"
            value="true"
            checked={callEnabled}
            onChange={(e) => setCallEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Arama butonunu göster
        </label>
        {callEnabled ? (
          <input
            name="fab_call_phone"
            value={callPhone}
            onChange={(e) => setCallPhone(e.target.value)}
            placeholder="+905551112233"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        ) : null}
      </div>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="fab_whatsapp_enabled"
            value="true"
            checked={whatsappEnabled}
            onChange={(e) => setWhatsappEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          WhatsApp butonunu göster
        </label>
        {whatsappEnabled ? (
          <input
            name="fab_whatsapp_phone"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="+905551112233"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        ) : null}
      </div>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="fab_location_enabled"
            value="true"
            checked={locationEnabled}
            onChange={(e) => setLocationEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Konum butonunu göster
        </label>
        {locationEnabled ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setLat("");
                setLng("");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
            >
              Konumu tekrar al
            </button>
            {loadingGeo ? <p className="text-xs text-gray-500">Konum alınıyor...</p> : null}
            {geoError ? <p className="text-xs text-red-600">{geoError}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="fab_location_lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                name="fab_location_lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
