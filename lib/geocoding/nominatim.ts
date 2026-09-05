/**
 * OpenStreetMap Nominatim — anahtarsız reverse geocoding.
 *
 * ⚠️ Geçici köprü. Nominatim'in kullanım politikası saniyede 1 isteği ve
 * tanımlayıcı bir User-Agent'ı zorunlu kılar; ağır ticari kullanıma uygun
 * değildir. GOOGLE_MAPS_SERVER_KEY tanımlandığı anda devreden çıkar.
 * Bu yüzden çağrı yalnızca sunucudan yapılır (bkz. lib/geocoding/index.ts):
 * orada önbellek ve hız sınırı var.
 */

import {
  cleanAddressPart,
  stripNeighborhoodSuffix,
  type GeocodingProvider,
  type ReverseGeocodeInput,
  type ReverseGeocodeResult,
} from "@/lib/geocoding/types";

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

/** Politika gereği uygulamayı tanımlayan bir User-Agent zorunlu. */
const USER_AGENT = "KendiSepetim/2.1 (+https://kendisepetim.com)";

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  residential?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  town?: string;
  county?: string;
  city?: string;
  province?: string;
  state?: string;
};

type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
};

function pickFirst(...values: (string | undefined)[]): string {
  for (const value of values) {
    const cleaned = cleanAddressPart(value);
    if (cleaned) return cleaned;
  }
  return "";
}

export const nominatimProvider: GeocodingProvider = {
  name: "nominatim",

  async reverse({ lat, lng }: ReverseGeocodeInput): Promise<ReverseGeocodeResult | null> {
    const url = new URL(ENDPOINT);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    // zoom=18 sokak seviyesi; daha yükseği bina numarasına iner, gerekmiyor.
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "tr");

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Nominatim yavaşlarsa müşteriyi bekletmeyelim; çağıran haritadan devam eder.
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResponse;
    if (data.error || !data.address) return null;

    const a = data.address;

    return {
      // Türkiye'de mahalle çoğunlukla suburb/neighbourhood altında geliyor.
      neighborhood: stripNeighborhoodSuffix(
        pickFirst(a.neighbourhood, a.suburb, a.quarter, a.city_district),
      ),
      street: pickFirst(a.road, a.pedestrian, a.residential, a.footway),
      district: pickFirst(a.city_district, a.town, a.county),
      city: pickFirst(a.province, a.city, a.state),
      formatted: cleanAddressPart(data.display_name),
      provider: "nominatim",
    };
  },
};
