/**
 * Google Geocoding API — koordinat → adres.
 *
 * Anahtar SUNUCUDA tutulur (GOOGLE_MAPS_SERVER_KEY, asla NEXT_PUBLIC_ değil).
 * Haritayı çizen tarayıcı anahtarı ayrıdır ve referrer ile kısıtlanmalıdır;
 * bu anahtar ise hiç tarayıcıya gitmez, böylece kota kötüye kullanılamaz.
 */

import {
  cleanAddressPart,
  stripNeighborhoodSuffix,
  type GeocodingProvider,
  type ReverseGeocodeInput,
  type ReverseGeocodeResult,
} from "@/lib/geocoding/types";

const ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleGeocodeResponse = {
  status?: string;
  results?: {
    formatted_address?: string;
    address_components?: GoogleAddressComponent[];
  }[];
};

export function getGoogleServerKey(): string | null {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  return key ? key : null;
}

/** İlk eşleşen bileşen türünü döndürür; Google sıralaması tutarsız olabiliyor. */
function componentByType(
  components: GoogleAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => Array.isArray(c.types) && c.types.includes(type));
    const value = cleanAddressPart(match?.long_name);
    if (value) return value;
  }
  return "";
}

export const googleProvider: GeocodingProvider = {
  name: "google",

  async reverse({ lat, lng }: ReverseGeocodeInput): Promise<ReverseGeocodeResult | null> {
    const key = getGoogleServerKey();
    if (!key) return null;

    const url = new URL(ENDPOINT);
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("language", "tr");
    url.searchParams.set("region", "tr");
    url.searchParams.set("key", key);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as GoogleGeocodeResponse;
    if (data.status !== "OK" || !data.results?.length) return null;

    const first = data.results[0];
    const components = first.address_components ?? [];

    return {
      // Türkiye'de mahalle bazen neighborhood, bazen idari 4. seviye olarak geliyor.
      neighborhood: stripNeighborhoodSuffix(
        componentByType(
          components,
          "neighborhood",
          "administrative_area_level_4",
          "sublocality_level_1",
          "sublocality",
        ),
      ),
      street: componentByType(components, "route"),
      district: componentByType(components, "administrative_area_level_2", "locality"),
      city: componentByType(components, "administrative_area_level_1"),
      formatted: cleanAddressPart(first.formatted_address),
      provider: "google",
    };
  },
};
