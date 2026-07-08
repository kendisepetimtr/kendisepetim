import type { FulfillmentType } from "@/lib/fulfillment";
import {
  resolveSelectedVariations,
  sanitizeSelectedVariations,
  sanitizeVariationGroups,
  sumVariationDeltas,
  type SelectedVariation,
  type VariationGroup,
} from "@/lib/menu-variations";
import type { PublicOrderLineInput } from "@/lib/orders";
import type { MenuProductRow } from "@/lib/supabase/menu-types";

/** order_lines insert için varyasyon/fiyat mantığı — müşteri ve garson yolları ortak kullanır. */
export const ORDER_LINE_PRODUCT_COLUMNS =
  "id, price, package_price, use_package_price, variation_groups" as const;

export type OrderLineCatalogEntry = {
  price: number;
  usePackagePrice: boolean;
  packagePrice: number;
  variationGroups: VariationGroup[];
};

export type BuiltOrderLine = {
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
  removed_ingredients: string[];
  selected_options: SelectedVariation[];
  sort_order: number;
};

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function baseCatalogPrice(catalog: OrderLineCatalogEntry, fulfillmentType: FulfillmentType): number {
  if (fulfillmentType === "pickup" || fulfillmentType === "dine_in") return catalog.price;
  return catalog.usePackagePrice ? catalog.packagePrice : catalog.price;
}

export function buildOrderLineCatalog(
  rows: Pick<MenuProductRow, "id" | "price" | "package_price" | "use_package_price" | "variation_groups">[],
): Map<string, OrderLineCatalogEntry> {
  const map = new Map<string, OrderLineCatalogEntry>();
  for (const row of rows) {
    map.set(row.id, {
      price: Number(row.price),
      usePackagePrice: row.use_package_price,
      packagePrice: Number(row.package_price),
      variationGroups: sanitizeVariationGroups(row.variation_groups),
    });
  }
  return map;
}

export function extractOrderLineProductIds(rawLines: PublicOrderLineInput[]): string[] {
  return rawLines
    .map((line) => (typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null))
    .filter((id): id is string => id != null);
}

/**
 * Sepet satırlarını güvenli order_lines kayıtlarına çevirir.
 * Fiyat katalogtan yeniden hesaplanır; varyasyon farkları ürünün gerçek seçeneklerine karşı doğrulanır.
 */
export function buildOrderLines(
  rawLines: PublicOrderLineInput[],
  catalogMap: Map<string, OrderLineCatalogEntry>,
  fulfillmentType: FulfillmentType,
): BuiltOrderLine[] {
  return rawLines
    .map((line, index): BuiltOrderLine | null => {
      const name = typeof line.name === "string" ? line.name.trim() : "";
      const qty =
        typeof line.qty === "number" && Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 0;
      if (!name || qty <= 0) return null;

      const productId = typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null;
      const catalog = productId ? catalogMap.get(productId) : null;

      let unitPrice: number;
      let selectedOptions: SelectedVariation[];

      if (catalog) {
        selectedOptions = resolveSelectedVariations(catalog.variationGroups, line.selectedOptions);
        unitPrice = roundMoney(baseCatalogPrice(catalog, fulfillmentType) + sumVariationDeltas(selectedOptions));
      } else {
        selectedOptions = sanitizeSelectedVariations(line.selectedOptions);
        unitPrice =
          typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0
            ? roundMoney(line.unitPrice)
            : 0;
      }

      return {
        product_id: productId,
        name,
        qty,
        unit_price: unitPrice,
        removed_ingredients: Array.isArray(line.removedIngredients)
          ? line.removedIngredients.filter(
              (item): item is string => typeof item === "string" && item.trim().length > 0,
            )
          : [],
        selected_options: selectedOptions,
        sort_order: index,
      };
    })
    .filter((line): line is BuiltOrderLine => line != null);
}
