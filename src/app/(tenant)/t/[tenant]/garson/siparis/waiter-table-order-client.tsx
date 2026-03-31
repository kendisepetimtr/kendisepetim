"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createWaiterTableOrder } from "../../../../../../features/orders";
import { formatTry } from "../../../../../../features/menu";
import type { CartItem, Category, Product } from "../../../../../../types";
import { effectiveOnlinePrice } from "../../../../../../types";

type WaiterTableOrderClientProps = {
  tenantSlug: string;
  tableNumber: string;
  restaurantName: string;
  categories: Category[];
  products: Product[];
};

export function WaiterTableOrderClient({
  tenantSlug,
  tableNumber,
  restaurantName,
  categories,
  products,
}: WaiterTableOrderClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCategories = useMemo(() => {
    return [...categories]
      .filter((c) => c.is_active)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [categories]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      if (!map[p.category_id]) map[p.category_id] = [];
      map[p.category_id]!.push(p);
    }
    for (const k of Object.keys(map)) {
      map[k]!.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return map;
  }, [products]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, p) => {
      const q = quantities[p.id] ?? 0;
      return sum + effectiveOnlinePrice(p) * q;
    }, 0);
  }, [products, quantities]);

  const totalItems = useMemo(() => {
    return Object.values(quantities).reduce((s, n) => s + n, 0);
  }, [quantities]);

  function setQty(productId: string, next: number) {
    setQuantities((prev) => {
      const n = { ...prev };
      if (next <= 0) delete n[productId];
      else n[productId] = next;
      return n;
    });
  }

  function submitOrder() {
    setErrorMessage(null);
    setDoneMessage(null);
    const cartItems: CartItem[] = [];
    for (const p of products) {
      const q = quantities[p.id] ?? 0;
      if (q <= 0) continue;
      const lineId = `${p.id}::garson::${tableNumber}::`;
      cartItems.push({
        lineId,
        productId: p.id,
        name: p.name,
        price: effectiveOnlinePrice(p),
        quantity: q,
        removedIngredients: [],
        addedIngredients: [],
        itemNote: null,
      });
    }
    if (cartItems.length === 0) {
      setErrorMessage("En az bir ürün seçin.");
      return;
    }

    startTransition(async () => {
      try {
        await createWaiterTableOrder({
          tenantSlug,
          tableNumber,
          cartItems,
          orderNote: orderNote.trim() || undefined,
        });
        setQuantities({});
        setOrderNote("");
        setDoneMessage("Sipariş mutfağa iletildi.");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Sipariş gönderilemedi.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Masa {tableNumber}</h1>
          <p className="text-sm text-gray-600">{restaurantName}</p>
        </div>
        <Link href={`/t/${tenantSlug}/garson`} className="text-sm text-gray-600 underline">
          Masalara dön
        </Link>
      </div>

      {doneMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {doneMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-8 pb-24">
        {activeCategories.map((cat) => {
          const items = productsByCategory[cat.id] ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">{cat.name}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((p) => {
                  const q = quantities[p.id] ?? 0;
                  return (
                    <li
                      key={p.id}
                      className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-400">Görsel yok</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p>
                        ) : null}
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formatTry(effectiveOnlinePrice(p))}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-sm"
                            onClick={() => setQty(p.id, q - 1)}
                            aria-label="Azalt"
                          >
                            −
                          </button>
                          <span className="min-w-[2ch] text-center text-sm font-medium">{q}</span>
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-sm"
                            onClick={() => setQty(p.id, q + 1)}
                            aria-label="Artır"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-gray-900">Sepet Özeti</h2>
          <label className="mt-3 block text-xs font-medium text-gray-600">Sipariş notu (isteğe bağlı)</label>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Örn: acısız"
          />
          <div className="mt-3 text-sm text-gray-700">
            <span className="font-medium text-gray-900">{totalItems}</span> kalem ·{" "}
            <span className="font-semibold text-gray-900">{formatTry(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={isPending || totalItems === 0}
            onClick={submitOrder}
            className="mt-3 w-full rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Gönderiliyor…" : "Siparişi tamamla"}
          </button>
        </aside>
      </div>
    </div>
  );
}
