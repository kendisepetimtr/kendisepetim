import { parseTimeToMinutes } from "@/lib/business-hours";
import { isValidCoordinate } from "@/lib/geo";
import { MARKETPLACE_MIN_PRODUCT_COUNT } from "@/lib/fulfillment";
import type { MarketplaceProfileInput } from "@/lib/marketplace";

export type MarketplaceChecklistKey =
  | "logo"
  | "cover"
  | "description"
  | "cuisine"
  | "neighborhood"
  | "location"
  | "fulfillment"
  | "products"
  | "public_menu"
  | "hours";

export type MarketplaceChecklistItem = {
  key: MarketplaceChecklistKey;
  label: string;
  shortLabel: string;
  /** Marketplace içi scroll hedefi veya panel dışı sekme */
  target: "in-panel" | "settings" | "menu" | "qr";
  anchorId?: string;
  navTab?: "settings" | "menu" | "qr";
};

export const MARKETPLACE_CHECKLIST_ITEMS: MarketplaceChecklistItem[] = [
  { key: "logo", label: "Logo yüklendi", shortLabel: "Logo", target: "settings", navTab: "settings" },
  { key: "cover", label: "Kapak görseli", shortLabel: "Kapak", target: "in-panel", anchorId: "marketplace-cover" },
  {
    key: "description",
    label: "Restoran açıklaması",
    shortLabel: "Açıklama",
    target: "in-panel",
    anchorId: "marketplace-description",
  },
  { key: "cuisine", label: "Mutfak türü seçildi", shortLabel: "Mutfak", target: "in-panel", anchorId: "marketplace-cuisine" },
  {
    key: "neighborhood",
    label: "Mahalle seçildi",
    shortLabel: "Mahalle",
    target: "in-panel",
    anchorId: "marketplace-location-fields",
  },
  { key: "location", label: "Haritada konum", shortLabel: "Konum", target: "in-panel", anchorId: "marketplace-map" },
  {
    key: "fulfillment",
    label: "Gel-al veya teslimat",
    shortLabel: "Teslimat",
    target: "in-panel",
    anchorId: "marketplace-fulfillment",
  },
  {
    key: "products",
    label: `En az ${MARKETPLACE_MIN_PRODUCT_COUNT} ürün`,
    shortLabel: "Ürünler",
    target: "menu",
    navTab: "menu",
  },
  { key: "public_menu", label: "QR menü açık", shortLabel: "QR menü", target: "qr", navTab: "qr" },
  { key: "hours", label: "Çalışma saati", shortLabel: "Saatler", target: "settings", navTab: "settings" },
];

export function isMarketplaceChecklistItemComplete(
  key: MarketplaceChecklistKey,
  input: MarketplaceProfileInput,
): boolean {
  switch (key) {
    case "logo":
      return input.logoUrl.trim().length > 0;
    case "cover":
      return input.coverImageUrl.trim().length > 0;
    case "description":
      return input.publicDescription.trim().length > 0;
    case "cuisine":
      return input.cuisineTags.length > 0;
    case "neighborhood":
      return input.neighborhood.trim().length > 0;
    case "location":
      return isValidCoordinate(input.latitude, input.longitude);
    case "fulfillment":
      return input.fulfillmentPickupEnabled || input.fulfillmentDeliveryEnabled;
    case "products":
      return input.productCount >= MARKETPLACE_MIN_PRODUCT_COUNT;
    case "public_menu":
      return input.publicMenuEnabled !== false;
    case "hours":
      return parseTimeToMinutes(input.openTime) != null && parseTimeToMinutes(input.closeTime) != null;
    default:
      return false;
  }
}

export function getMarketplaceChecklistStatus(input: MarketplaceProfileInput) {
  const items = MARKETPLACE_CHECKLIST_ITEMS.map((item) => ({
    ...item,
    complete: isMarketplaceChecklistItemComplete(item.key, input),
  }));
  const completedCount = items.filter((i) => i.complete).length;
  return {
    items,
    completedCount,
    totalCount: items.length,
    allComplete: completedCount === items.length,
  };
}
