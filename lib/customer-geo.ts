const KEY = "ks_customer_geo_v1";

export type CustomerGeo = { lat: number; lng: number };

export function getSavedCustomerGeo(): CustomerGeo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CustomerGeo;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveCustomerGeo(geo: CustomerGeo): void {
  window.localStorage.setItem(KEY, JSON.stringify(geo));
}

export function requestCustomerGeo(): Promise<CustomerGeo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcı konum desteklemiyor."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveCustomerGeo(geo);
        resolve(geo);
      },
      () => reject(new Error("Konum alınamadı. Tarayıcı iznini kontrol edin.")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
    );
  });
}
