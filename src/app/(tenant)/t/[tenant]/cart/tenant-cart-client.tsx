"use client";

import Link from "next/link";
import { formatTry, useTenantCart } from "../../../../../features/menu";

type TenantCartClientProps = {
  tenantSlug: string;
};

export function TenantCartClient({ tenantSlug }: TenantCartClientProps) {
  const { cartItems, removeFromCart, subtotal, totalQuantity, updateQuantity } =
    useTenantCart(tenantSlug);

  if (cartItems.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-600">Sepetiniz bos. Menuye donup urun ekleyebilirsiniz.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Secilen Urunler</h2>
        <p className="mt-1 text-xs text-gray-500">{totalQuantity} adet urun</p>

        <div className="mt-4 space-y-3">
          {cartItems.map((item) => (
            <article key={item.lineId} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">{formatTry(item.price)}</p>
                  {item.removedIngredients && item.removedIngredients.length > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Çıkarılan: {item.removedIngredients.join(", ")}
                    </p>
                  ) : null}
                  {item.addedIngredients && item.addedIngredients.length > 0 ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Eklenen: {item.addedIngredients.join(", ")}
                    </p>
                  ) : null}
                  {item.itemNote ? (
                    <p className="mt-1 text-xs text-gray-500">Not: {item.itemNote}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.lineId)}
                  className="text-xs text-red-700"
                >
                  Kaldir
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  -
                </button>
                <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  +
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
          <span>Ara Toplam</span>
          <span>{formatTry(subtotal)}</span>
        </div>
        <Link
          href={`/t/${tenantSlug}/checkout`}
          className="mt-4 block rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-black"
        >
          Checkout'a Gec
        </Link>
      </div>
    </section>
  );
}
