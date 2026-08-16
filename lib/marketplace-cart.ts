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

export function getMarketplaceCart(): MarketplaceCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p) || typeof p.subdomain !== "string" || !Array.isArray(p.lines)) return null;
    const lines: MarketplaceCartLine[] = [];
    for (const row of p.lines) {
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
    const detail =
      isRecord(p.detail) ? (p.detail as MarketplaceCartDetail) : undefined;
    return {
      subdomain: p.subdomain.toLowerCase(),
      restaurantName: typeof p.restaurantName === "string" ? p.restaurantName : p.subdomain,
      lines,
      detail,
    };
  } catch {
    return null;
  }
}

export function saveMarketplaceCart(cart: MarketplaceCart | null): void {
  if (typeof window === "undefined") return;
  if (!cart || cart.lines.length === 0) {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("ks-cart-change"));
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(cart));
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
