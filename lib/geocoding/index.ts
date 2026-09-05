/**
 * Reverse geocoding giriş noktası — sağlayıcı seçimi, önbellek, hız sınırı.
 *
 * Yalnızca sunucudan çağırın (route handler). Sebep: sağlayıcı anahtarı gizli
 * kalsın, Nominatim'in saniyede 1 istek kuralı tek yerden uygulanabilsin ve
 * kullanıcı haritada pini oynatırken her piksel için dış istek gitmesin.
 */

import { googleProvider, getGoogleServerKey } from "@/lib/geocoding/google";
import { nominatimProvider } from "@/lib/geocoding/nominatim";
import type { ReverseGeocodeResult } from "@/lib/geocoding/types";

/** ~11 m. Bundan ince ayrım adres metnini değiştirmiyor, önbellek isabetini düşürüyor. */
const CACHE_PRECISION = 4;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

/** Nominatim politikası: saniyede en fazla 1 istek. */
const NOMINATIM_MIN_INTERVAL_MS = 1_100;

type CacheEntry = { value: ReverseGeocodeResult; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number, provider: string): string {
  return `${provider}:${lat.toFixed(CACHE_PRECISION)},${lng.toFixed(CACHE_PRECISION)}`;
}

function readCache(key: string): ReverseGeocodeResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  // En son kullanılanı sona taşı — basit LRU.
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function writeCache(key: string, value: ReverseGeocodeResult): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Nominatim çağrılarını sıraya dizer; eş zamanlı istekler politika ihlali olmasın. */
let nominatimQueue: Promise<unknown> = Promise.resolve();

function throttleNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(async () => {
    const result = await task();
    await new Promise((resolve) => setTimeout(resolve, NOMINATIM_MIN_INTERVAL_MS));
    return result;
  });
  // Zincir kopmasın: hata da olsa sıradaki devam etsin.
  nominatimQueue = run.catch(() => undefined);
  return run;
}

export function activeGeocodingProviderName(): "google" | "nominatim" {
  return getGoogleServerKey() ? "google" : "nominatim";
}

/**
 * Koordinatı adrese çevirir. Sağlayıcı hata verirse `null` döner —
 * çağıran taraf bunu ölümcül saymamalı; kullanıcı pini zaten koymuştur,
 * yalnızca mahalle/sokak metni gelmemiş olur.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const useGoogle = getGoogleServerKey() != null;
  const provider = useGoogle ? googleProvider : nominatimProvider;

  const key = cacheKey(lat, lng, provider.name);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const result = useGoogle
      ? await provider.reverse({ lat, lng })
      : await throttleNominatim(() => provider.reverse({ lat, lng }));

    if (!result) return null;
    writeCache(key, result);
    return result;
  } catch {
    // Zaman aşımı, ağ hatası, sağlayıcı kotası — hepsi aynı: adres metni yok.
    return null;
  }
}
