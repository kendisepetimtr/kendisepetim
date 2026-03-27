"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatTry, useTenantCart } from "../../../../features/menu";
import type { Category, Product } from "../../../../types";

type TenantMenuClientProps = {
  tenantSlug: string;
  categories: Category[];
  products: Product[];
};

export function TenantMenuClient({
  tenantSlug,
  categories,
  products,
}: TenantMenuClientProps) {
  const { addToCart, cartItems, removeFromCart, subtotal, totalQuantity, updateQuantity } =
    useTenantCart(tenantSlug);

  const productsByCategory = useMemo(() => {
    return products.reduce<Record<string, Product[]>>((acc, product) => {
      if (!acc[product.category_id]) {
        acc[product.category_id] = [];
      }
      acc[product.category_id].push(product);
      return acc;
    }, {});
  }, [products]);

  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {activeCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
            Bu restoran icin henuz kategori bulunmuyor.
          </div>
        ) : (
          activeCategories.map((category) => {
            const categoryProducts = productsByCategory[category.id] ?? [];

            return (
              <section key={category.id} className="space-y-4">
                <header>
                  <h2 className="text-xl font-semibold">{category.name}</h2>
                  {category.description ? (
                    <p className="mt-1 text-sm text-gray-600">{category.description}</p>
                  ) : null}
                </header>

                {categoryProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">Bu kategoride aktif urun yok.</p>
                ) : (
                  <div className="grid gap-3">
                    {categoryProducts.map((product) => (
                      <article
                        key={product.id}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            {product.description ? (
                              <p className="mt-1 text-sm text-gray-600">{product.description}</p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-800">
                              {formatTry(product.price)}
                            </p>
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="mt-2 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
                            >
                              Sepete Ekle
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-4">
        <h2 className="text-base font-semibold text-gray-900">Sepet</h2>
        <p className="mt-1 text-xs text-gray-500">{totalQuantity} urun secildi</p>

        {cartItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Sepetiniz bos.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.productId} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">{formatTry(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="text-xs text-red-700"
                  >
                    Kaldir
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    -
                  </button>
                  <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                <span>Toplam</span>
                <span>{formatTry(subtotal)}</span>
              </div>
            </div>
            <Link
              href={`/t/${tenantSlug}/cart`}
              className="block w-full rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-black"
            >
              Sepete Git
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
