/** MVP lansman: Antalya / Muratpaşa — tüm resmi mahalleler. */

export type GeographyCity = {
  name: string;
  districts: GeographyDistrict[];
};

export type GeographyDistrict = {
  name: string;
  neighborhoods: string[];
};

/** Muratpaşa ilçesi resmi mahalle listesi (55). */
export const MURATPASA_NEIGHBORHOODS: readonly string[] = [
  "Altındağ",
  "Bahçelievler",
  "Balbey",
  "Barbaros",
  "Bayındır",
  "Çağlayan",
  "Çaybaşı",
  "Cumhuriyet",
  "Demircikara",
  "Deniz",
  "Doğuyaka",
  "Dutlubahçe",
  "Elmalı",
  "Ermenek",
  "Etiler",
  "Fener",
  "Gebizli",
  "Gençlik",
  "Güvenlik",
  "Güzelbağ",
  "Güzeloba",
  "Güzeloluk",
  "Haşim İşcan",
  "Kılınçarslan",
  "Kırcami",
  "Kışla",
  "Kızılarık",
  "Kızılsaray",
  "Kızıltoprak",
  "Konuksever",
  "Mehmetçik",
  "Meltem",
  "Memurevleri",
  "Meydankavağı",
  "Muratpaşa",
  "Sanayi",
  "Sedir",
  "Selçuk",
  "Sinan",
  "Soğuksu",
  "Şirinyalı",
  "Tahılpazarı",
  "Tarım",
  "Topçular",
  "Tuzcular",
  "Üçgen",
  "Varlık",
  "Yenigöl",
  "Yenigün",
  "Yeşilbahçe",
  "Yeşildere",
  "Yeşilköy",
  "Yeşilova",
  "Yıldız",
  "Yüksekalan",
  "Zerdalilik",
  "Zümrütova",
] as const;

export const LAUNCH_CITY = "Antalya" as const;
export const LAUNCH_DISTRICT = "Muratpaşa" as const;

export const TURKEY_GEOGRAPHY: readonly GeographyCity[] = [
  {
    name: LAUNCH_CITY,
    districts: [
      {
        name: LAUNCH_DISTRICT,
        neighborhoods: [...MURATPASA_NEIGHBORHOODS],
      },
    ],
  },
] as const;

/** Antalya Lara bölgesi — harita varsayılan merkezi. */
export const DEFAULT_MAP_CENTER = {
  lat: 36.8567,
  lng: 30.6383,
} as const;

export function getDistrictsForCity(cityName: string): GeographyDistrict[] {
  return TURKEY_GEOGRAPHY.find((c) => c.name === cityName)?.districts ?? [];
}

export function getNeighborhoodsForDistrict(cityName: string, districtName: string): string[] {
  const district = getDistrictsForCity(cityName).find((d) => d.name === districtName);
  return district?.neighborhoods ?? [];
}

export function isValidNeighborhood(city: string, district: string, neighborhood: string): boolean {
  return getNeighborhoodsForDistrict(city, district).includes(neighborhood);
}

export function getLaunchCities(): string[] {
  return TURKEY_GEOGRAPHY.map((c) => c.name);
}
