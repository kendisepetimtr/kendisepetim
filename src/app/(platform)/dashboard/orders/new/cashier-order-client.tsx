"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatTry } from "../../../../../features/menu";
import { createCashierPackageOrder, createCashierTableOrder } from "../../../../../features/orders";
import { effectiveOnlinePrice, type CartItem, type Category, type Product } from "../../../../../types";

type CashierOrderClientProps = {
  mode: "table" | "package";
  tableNumber?: string;
  categories: Category[];
  products: Product[];
};

export function CashierOrderClient({ mode, tableNumber, categories, products }: CashierOrderClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [showPackageConfirmModal, setShowPackageConfirmModal] = useState(false);
  const [showPackageCustomerModal, setShowPackageCustomerModal] = useState(false);
  const [activePackageProduct, setActivePackageProduct] = useState<Product | null>(null);
  const [packageModalQty, setPackageModalQty] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.is_active)
        .sort((a, b) => (a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.created_at.localeCompare(b.created_at))),
    [categories],
  );

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      if (!map[p.category_id]) map[p.category_id] = [];
      map[p.category_id]!.push(p);
    }
    for (const key of Object.keys(map)) {
      map[key]!.sort((a, b) => (a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.created_at.localeCompare(b.created_at)));
    }
    return map;
  }, [products]);

  const totalItems = useMemo(() => Object.values(quantities).reduce((s, n) => s + n, 0), [quantities]);
  const subtotal = useMemo(
    () => products.reduce((sum, p) => sum + (quantities[p.id] ?? 0) * effectiveOnlinePrice(p), 0),
    [products, quantities],
  );

  function setQty(productId: string, next: number) {
    setQuantities((prev) => {
      const n = { ...prev };
      if (next <= 0) delete n[productId];
      else n[productId] = next;
      return n;
    });
  }

  function openPackageProductModal(product: Product) {
    const current = quantities[product.id] ?? 0;
    setActivePackageProduct(product);
    setPackageModalQty(current > 0 ? current : 1);
  }

  function buildCartItems(): CartItem[] {
    const items: CartItem[] = [];
    for (const p of products) {
      const q = quantities[p.id] ?? 0;
      if (q <= 0) continue;
      items.push({
        lineId: `${p.id}::cashier::${mode}`,
        productId: p.id,
        name: p.name,
        price: effectiveOnlinePrice(p),
        quantity: q,
        removedIngredients: [],
        addedIngredients: [],
        itemNote: null,
      });
    }
    return items;
  }

  function submitOrderFinal() {
    setErrorMessage(null);
    setDoneMessage(null);
    const cartItems = buildCartItems();
    if (cartItems.length === 0) {
      setErrorMessage("En az bir ürün seçin.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "table") {
          await createCashierTableOrder({
            tableNumber: tableNumber ?? "",
            cartItems,
            orderNote: orderNote.trim() || undefined,
          });
        } else {
          if (!customerName.trim() || !customerPhone.trim()) {
            setErrorMessage("Müşteri adı ve telefon zorunludur.");
            return;
          }
          await createCashierPackageOrder({
            cartItems,
            orderNote: orderNote.trim() || undefined,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            deliveryAddress: customerAddress.trim() || undefined,
          });
        }
        setQuantities({});
        setOrderNote("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setShowPackageConfirmModal(false);
        setShowPackageCustomerModal(false);
        setDoneMessage("Sipariş başarıyla oluşturuldu.");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Sipariş oluşturulamadı.");
      }
    });
  }

  function onMainSubmitClick() {
    if (mode === "package") {
      if (totalItems === 0) {
        setErrorMessage("En az bir ürün seçin.");
        return;
      }
      setShowPackageConfirmModal(true);
      return;
    }
    submitOrderFinal();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {mode === "table" ? `Masa ${tableNumber} · Kasa siparişi` : "Paket · Kasa siparişi"}
          </h1>
          <p className="text-sm text-gray-600">Garson akışının kasa versiyonu</p>
        </div>
        <Link href="/dashboard/orders?channel=table" className="text-sm text-gray-600 underline">
          Siparişlere dön
        </Link>
      </div>

      {doneMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{doneMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="space-y-8 pb-40">
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
                    <li key={p.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-400">Görsel yok</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p> : null}
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formatTry(effectiveOnlinePrice(p))}</p>
                        {mode === "package" ? (
                          <button
                            type="button"
                            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800"
                            onClick={() => openPackageProductModal(p)}
                          >
                            {q > 0 ? `${q} adet seçildi` : "Modaldan ekle"}
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" className="rounded-md border border-gray-300 px-2.5 py-1 text-sm" onClick={() => setQty(p.id, q - 1)}>
                              −
                            </button>
                            <span className="min-w-[2ch] text-center text-sm font-medium">{q}</span>
                            <button type="button" className="rounded-md border border-gray-300 px-2.5 py-1 text-sm" onClick={() => setQty(p.id, q + 1)}>
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <label className="mb-2 block text-xs font-medium text-gray-600">Sipariş notu (isteğe bağlı)</label>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Örn: acısız"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">{totalItems}</span> kalem ·{" "}
            <span className="font-semibold text-gray-900">{formatTry(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={isPending || totalItems === 0}
            onClick={onMainSubmitClick}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Kaydediliyor…" : mode === "package" ? "Onay ekranına geç" : "Sipariş al"}
          </button>
        </div>
      </div>

      {mode === "package" && activePackageProduct ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{activePackageProduct.name}</h3>
            {activePackageProduct.description ? (
              <p className="mt-1 text-sm text-gray-600">{activePackageProduct.description}</p>
            ) : null}
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatTry(effectiveOnlinePrice(activePackageProduct))}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                onClick={() => setPackageModalQty((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-base font-semibold">{packageModalQty}</span>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                onClick={() => setPackageModalQty((n) => n + 1)}
              >
                +
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setActivePackageProduct(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  setQty(activePackageProduct.id, packageModalQty);
                  setActivePackageProduct(null);
                }}
              >
                Sepete ekle
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "package" && showPackageConfirmModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Sipariş Onayı</h3>
            <p className="mt-1 text-sm text-gray-600">Kalemleri kontrol edin, ardından müşteri bilgisine geçin.</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto rounded-lg border border-gray-200 p-2">
              {buildCartItems().map((item) => (
                <div key={item.lineId} className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1.5 text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <strong>{formatTry(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-sm font-semibold text-gray-900">Toplam: {formatTry(subtotal)}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setShowPackageConfirmModal(false)}
              >
                Geri
              </button>
              <button
                type="button"
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  setShowPackageConfirmModal(false);
                  setShowPackageCustomerModal(true);
                }}
              >
                Müşteri bilgisine geç
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "package" && showPackageCustomerModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Müşteri Bilgileri</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Müşteri adı soyadı"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Telefon"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Adres (opsiyonel)"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => {
                  setShowPackageCustomerModal(false);
                  setShowPackageConfirmModal(true);
                }}
              >
                Geri
              </button>
              <button
                type="button"
                disabled={isPending}
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={submitOrderFinal}
              >
                {isPending ? "Kaydediliyor…" : "Siparişi onayla"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
