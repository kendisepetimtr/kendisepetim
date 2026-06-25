import { CUISINE_TAG_OPTIONS, type CuisineTag } from "@/lib/marketplace";

/** Statik mutfak kapak görselleri — public/marketplace/covers/ */
export const MARKETPLACE_COVERS_BASE = "/marketplace/covers";

const CUISINE_COVER_SLUG: Record<CuisineTag, string> = {
  Burger: "burger",
  Kebap: "kebap",
  Pizza: "pizza",
  Döner: "doner",
  Tatlı: "tatli",
  Kahvaltı: "kahvalti",
  "Ev Yemekleri": "ev-yemekleri",
  "Deniz Ürünleri": "deniz-urunleri",
  Vegan: "vegan",
  Kafe: "kafe",
  "Fast Food": "fast-food",
  "Dünya Mutfağı": "dunya-mutfagi",
};

export const DEFAULT_CUISINE_COVER_URL = `${MARKETPLACE_COVERS_BASE}/default.jpg`;

export function getCuisineCoverUrl(tag: string): string | null {
  if (!(CUISINE_TAG_OPTIONS as readonly string[]).includes(tag)) return null;
  const slug = CUISINE_COVER_SLUG[tag as CuisineTag];
  return `${MARKETPLACE_COVERS_BASE}/${slug}.jpg`;
}

export function getPrimaryCuisineCoverUrl(cuisineTags: string[]): string {
  for (const tag of cuisineTags) {
    const url = getCuisineCoverUrl(tag);
    if (url) return url;
  }
  return DEFAULT_CUISINE_COVER_URL;
}

export function isPresetMarketplaceCoverUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return trimmed.startsWith(MARKETPLACE_COVERS_BASE + "/");
}

/** Özel yükleme yoksa mutfak türüne göre kapak önerir. */
export function resolveAutoCoverImageUrl(currentCover: string, cuisineTags: string[]): string {
  const trimmed = currentCover.trim();
  if (trimmed && !isPresetMarketplaceCoverUrl(trimmed)) {
    return trimmed;
  }
  if (cuisineTags.length === 0) {
    return trimmed || DEFAULT_CUISINE_COVER_URL;
  }
  return getPrimaryCuisineCoverUrl(cuisineTags);
}

export function allPresetCoverUrls(): string[] {
  return [
    DEFAULT_CUISINE_COVER_URL,
    ...CUISINE_TAG_OPTIONS.map((tag) => getCuisineCoverUrl(tag)!),
  ];
}
