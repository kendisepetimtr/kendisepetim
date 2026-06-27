import type { LocalMenuProduct, LocalMenuState } from "@/lib/local-menu";

/** API / server action yanıtında taşınabilecek maksimum URL uzunluğu. */
const MAX_CLIENT_SYNC_URL_LENGTH = 2048;

function stripHeavyMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_CLIENT_SYNC_URL_LENGTH) return "";
  if (trimmed.startsWith("data:") && trimmed.length > 512) return "";
  return trimmed;
}

function slimProductForClient(product: LocalMenuProduct): LocalMenuProduct {
  return {
    ...product,
    imageDataUrl: stripHeavyMediaUrl(product.imageDataUrl),
  };
}

/** Sunucu menü yanıtında ürün görsellerindeki ağır blob'ları kırpar. */
export function slimMenuStateForClient(state: LocalMenuState): LocalMenuState {
  return {
    categories: state.categories,
    products: state.products.map(slimProductForClient),
  };
}

/** Sunucu menüsü + paneldeki mevcut durum (görseller) birleşimi. */
export function mergeDashboardMenuStates(local: LocalMenuState, server: LocalMenuState): LocalMenuState {
  const imageById = new Map(local.products.map((p) => [p.id, p.imageDataUrl]));
  return {
    categories: server.categories,
    products: server.products.map((p) => ({
      ...p,
      imageDataUrl: p.imageDataUrl || imageById.get(p.id) || "",
    })),
  };
}
