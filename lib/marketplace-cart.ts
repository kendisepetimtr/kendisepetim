import { readSharedJson, writeSharedJson } from "@/lib/shared-browser-storage";

const KEY = "kendisepetim_marketplace_cart_v1";

export type MarketplaceCartLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type MarketplaceCartDetail = Record<
  string,
  {
    productId: string;
    qty: number;
    removedIngredients: string[];
    selectedOptions: {
      groupId: string;
      groupName: string;
      optionId: string;
      optionLabel: string;
      priceDelta: number;
    }[];
  }
>;

export type MarketplaceCart = {
  subdomain: string;
  restaurantName: string;
  lines: MarketplaceCartLine[];
  detail?: MarketplaceCartDetail;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseCart(raw: unknown): MarketplaceCart | null {
  if (!isRecord(raw) || typeof raw.subdomain !== "string" || !Array.isArray(raw.lines)) return null;
  const lines: MarketplaceCartLine[] = [];
  for (const row of raw.lines) {
    if (!isRecord(row)) continue;
    const qty = Number(row.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    lines.push({
      productId: String(row.productId ?? ""),
      name: String(row.name ?? "Ürün"),
      qty,
      unitPrice: Number(row.unitPrice) || 0,
    });
  }
  if (lines.length === 0) return null;
  const detail = isRecord(raw.detail) ? (raw.detail as MarketplaceCartDetail) : undefined;
  return {
    subdomain: raw.subdomain.toLowerCase(),
    restaurantName: typeof raw.restaurantName === "string" ? raw.restaurantName : raw.subdomain,
    lines,
    detail,
  };
}

export function getMarketplaceCart(): MarketplaceCart | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCart(readSharedJson(KEY));
  } catch {
    return null;
  }
}

export function saveMarketplaceCart(cart: MarketplaceCart | null): void {
  if (typeof window === "undefined") return;
  if (!cart || cart.lines.length === 0) {
    writeSharedJson(KEY, null);
    window.dispatchEvent(new Event("ks-cart-change"));
    return;
  }
  writeSharedJson(KEY, cart);
  window.dispatchEvent(new Event("ks-cart-change"));
}

export function clearMarketplaceCart(): void {
  saveMarketplaceCart(null);
}

export function marketplaceCartQty(cart: MarketplaceCart | null): number {
  if (!cart) return 0;
  return cart.lines.reduce((s, l) => s + l.qty, 0);
}

export function marketplaceCartTotal(cart: MarketplaceCart | null): number {
  if (!cart) return 0;
  return cart.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export function subscribeMarketplaceCart(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener("ks-cart-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("ks-cart-change", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Aynı anda tek restoran. İkinci restorana geçmek için sepeti boşaltmayı onaylatır. */
export function confirmRestaurantCartSwitch(subdomain: string, restaurantName: string): boolean {
  const existing = getMarketplaceCart();
  const next = subdomain.toLowerCase();
  if (!existing || existing.subdomain === next) return true;
  return window.confirm(
    `${existing.restaurantName} sepetiniz dolu. ${restaurantName} için sepeti boşaltıp devam etmek istiyor musunuz? Aynı anda tek restorandan sipariş verebilirsiniz.`,
  );
}

export function persistMenuCartToMarketplace(input: {
  subdomain: string;
  restaurantName: string;
  lines: MarketplaceCartLine[];
  detail?: MarketplaceCartDetail;
}): void {
  if (input.lines.length === 0) {
    const existing = getMarketplaceCart();
    if (existing && existing.subdomain === input.subdomain.toLowerCase()) {
      clearMarketplaceCart();
    }
    return;
  }
  saveMarketplaceCart({
    subdomain: input.subdomain.toLowerCase(),
    restaurantName: input.restaurantName,
    lines: input.lines,
    detail: input.detail,
  });
}
