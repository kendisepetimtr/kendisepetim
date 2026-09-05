"use client";

/** Tarayıcı tarafı: /api/geocode/reverse sarmalayıcısı. */

export type ResolvedAddress = {
  neighborhood: string;
  street: string;
  district: string;
  city: string;
  formatted: string;
};

type ReverseResponse = {
  ok?: boolean;
  address?: ResolvedAddress | null;
  error?: string;
};

/**
 * Koordinatı adrese çevirir.
 * `null` = adres metni alınamadı (pin yine geçerli, akış tıkanmaz).
 * Hata fırlatmaz; çağıran taraf sadece "adres gelmedi" durumunu ele alır.
 */
export async function reverseGeocodeClient(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ResolvedAddress | null> {
  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { signal },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as ReverseResponse;
    return data.ok && data.address ? data.address : null;
  } catch {
    return null;
  }
}
