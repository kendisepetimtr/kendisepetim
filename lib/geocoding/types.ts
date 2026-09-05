/**
 * Koordinat → adres çevirisi (reverse geocoding) ortak tipleri.
 *
 * Sağlayıcı değiştirilebilir: bugün Nominatim (OpenStreetMap, anahtarsız),
 * GOOGLE_MAPS_SERVER_KEY tanımlanınca Google Geocoding. Çağıran taraf hangisinin
 * kullanıldığını bilmez.
 */

export type ReverseGeocodeProvider = "google" | "nominatim";

export type ReverseGeocodeResult = {
  /** Mahalle — sağlayıcı ne döndürürse (ör. "Şirinyalı"). Boş olabilir. */
  neighborhood: string;
  /** Sokak / cadde. Boş olabilir (kırsal nokta, yeni yol). */
  street: string;
  /** İlçe — bilgi amaçlı, kullanıcıya gösterilir. */
  district: string;
  /** İl. */
  city: string;
  /** Sağlayıcının tam adres metni — teyit için gösterilir. */
  formatted: string;
  provider: ReverseGeocodeProvider;
};

export type ReverseGeocodeInput = {
  lat: number;
  lng: number;
};

export interface GeocodingProvider {
  readonly name: ReverseGeocodeProvider;
  reverse(input: ReverseGeocodeInput): Promise<ReverseGeocodeResult | null>;
}

/** "Şirinyalı Mahallesi" → "Şirinyalı"; sağlayıcılar bu eki tutarsız veriyor. */
export function stripNeighborhoodSuffix(value: string): string {
  return value
    .replace(/\s+(mahallesi|mah\.?|mahalle)$/iu, "")
    .trim();
}

/** Boş / anlamsız sağlayıcı yanıtlarını ayıklar. */
export function cleanAddressPart(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "";
  return trimmed;
}
