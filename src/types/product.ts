export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  delivery_price: number | null;
  use_delivery_price: boolean;
  ingredients: string[];
  image_url: string | null;
  image_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

/** Müşteri online menüsü ve bu kanaldan verilen siparişlerde kullanılacak birim fiyat. */
export function effectiveOnlinePrice(
  product: Pick<Product, "price" | "delivery_price" | "use_delivery_price">,
): number {
  if (
    product.use_delivery_price &&
    product.delivery_price != null &&
    Number.isFinite(Number(product.delivery_price))
  ) {
    return Number(Number(product.delivery_price).toFixed(2));
  }
  return Number(Number(product.price).toFixed(2));
}
