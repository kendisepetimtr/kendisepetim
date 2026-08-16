import { LAUNCH_CITY, LAUNCH_DISTRICT, isValidNeighborhood } from "@/lib/turkey-geography";
import { isValidCoordinate } from "@/lib/geo";
import { MARKETPLACE_MIN_PRODUCT_COUNT } from "@/lib/fulfillment";

export const CUISINE_TAG_OPTIONS = [
  "Burger",
  "Kebap",
  "Pizza",
  "Döner",
  "Tatlı",
  "Kahvaltı",
  "Ev Yemekleri",
  "Deniz Ürünleri",
  "Vegan",
  "Kafe",
  "Fast Food",
  "Dünya Mutfağı",
] as const;

export type CuisineTag = (typeof CUISINE_TAG_OPTIONS)[number];

export type MarketplaceProfileInput = {
  marketplaceEnabled: boolean;
  city: string;
  district: string;
  neighborhood: string;
  cuisineTags: string[];
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string;
  logoUrl: string;
  publicDescription: string;
  publicMenuEnabled: boolean;
  fulfillmentPickupEnabled: boolean;
  fulfillmentDeliveryEnabled: boolean;
  productCount: number;
};

export type MarketplaceQualityIssue = {
  key: string;
  label: string;
};

export function getMarketplaceQualityIssues(input: MarketplaceProfileInput): MarketplaceQualityIssue[] {
  const issues: MarketplaceQualityIssue[] = [];
  if (!input.coverImageUrl.trim()) issues.push({ key: "cover", label: "Kapak görseli" });
  if (!input.logoUrl.trim()) issues.push({ key: "logo", label: "Logo" });
  if (input.cuisineTags.length === 0) {
    issues.push({ key: "cuisine", label: "Mutfak türü seçimi" });
  }
  if (input.productCount < MARKETPLACE_MIN_PRODUCT_COUNT) {
    issues.push({ key: "products", label: `En az ${MARKETPLACE_MIN_PRODUCT_COUNT} ürün` });
  }
  if (!input.neighborhood.trim()) issues.push({ key: "neighborhood", label: "Mahalle seçimi" });
  if (!input.publicDescription.trim()) issues.push({ key: "description", label: "Restoran açıklaması" });
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    issues.push({ key: "location", label: "Haritada konum pin'i" });
  }
  if (!input.fulfillmentPickupEnabled && !input.fulfillmentDeliveryEnabled) {
    issues.push({ key: "fulfillment", label: "Gel-al veya teslimat seçeneği" });
  }
  if (input.publicMenuEnabled === false) {
    issues.push({ key: "public_menu", label: "QR menü açık olmalı" });
  }
  if (input.city !== LAUNCH_CITY || input.district !== LAUNCH_DISTRICT) {
    issues.push({ key: "region", label: `${LAUNCH_CITY} / ${LAUNCH_DISTRICT} bölgesi` });
  }
  if (
    input.neighborhood.trim() &&
    !isValidNeighborhood(input.city, input.district, input.neighborhood.trim())
  ) {
    issues.push({ key: "neighborhood_invalid", label: "Geçerli mahalle seçimi" });
  }
  return issues;
}

export function canEnableMarketplace(input: MarketplaceProfileInput): boolean {
  return getMarketplaceQualityIssues(input).length === 0;
}

export function isMarketplaceListable(input: MarketplaceProfileInput): boolean {
  return input.marketplaceEnabled && canEnableMarketplace(input);
}

export type MarketplaceListing = {
  id: string;
  subdomain: string;
  businessName: string;
  logoUrl: string;
  coverImageUrl: string;
  publicDescription: string;
  neighborhood: string;
  cuisineTags: string[];
  deliveryRadiusKm: number;
  fulfillmentPickupEnabled: boolean;
  fulfillmentDeliveryEnabled: boolean;
  isOpen: boolean;
  signatureDishName: string | null;
  signatureDishPrice: number | null;
  latitude: number | null;
  longitude: number | null;
  minOrderAmount: number | null;
};
