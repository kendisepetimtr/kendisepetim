import type { LocalMenuProduct } from "@/lib/local-menu";
import type { SelectedVariation } from "@/lib/menu-variations";

export type CartEntry = {
  productId: string;
  qty: number;
  removedIngredients: string[];
  selectedOptions: SelectedVariation[];
};

export type CartState = Record<string, CartEntry>;

export type CartLine = {
  key: string;
  product: LocalMenuProduct;
  qty: number;
  removedIngredients: string[];
  selectedOptions: SelectedVariation[];
};

/** Aynı ürünü farklı varyasyon/çıkarma ile ayrı satır tutar. */
export function buildCartKey(
  productId: string,
  removedIngredients: readonly string[],
  selectedOptions: readonly SelectedVariation[],
): string {
  const removed = [...removedIngredients].sort().join("|");
  const opts = selectedOptions
    .map((o) => `${o.groupId}:${o.optionId}`)
    .sort()
    .join(",");
  return `${productId}::${removed}::${opts}`;
}

export function buildCartLines(cart: CartState, products: LocalMenuProduct[]): CartLine[] {
  const lines: CartLine[] = [];
  for (const [key, entry] of Object.entries(cart)) {
    if (entry.qty <= 0) continue;
    const product = products.find((p) => p.id === entry.productId);
    if (!product) continue;
    lines.push({
      key,
      product,
      qty: entry.qty,
      removedIngredients: entry.removedIngredients,
      selectedOptions: entry.selectedOptions ?? [],
    });
  }
  return lines;
}
