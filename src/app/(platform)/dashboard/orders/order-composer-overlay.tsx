"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatTry } from "../../../../features/menu";
import { createCashierPackageOrder, createCashierTableOrder } from "../../../../features/orders";
import {
  effectiveOnlinePrice,
  type CartItem,
  type Category,
  type Customer,
  type Product,
} from "../../../../types";

type OrderComposerOverlayProps = {
  mode: "table" | "package";
  closeHref: string;
  switchTableHref?: string;
  switchPackageHref?: string;
  enableTableOrders: boolean;
  enablePackageOrders: boolean;
  posMode?: boolean;
  initialTable?: string;
  tableCount: number;
  pendingByTable: Record<string, number>;
  categories: Category[];
  products: Product[];
  customers: Customer[];
};

export function OrderComposerOverlay({
  mode,
  closeHref,
  switchTableHref,
  switchPackageHref,
  enableTableOrders,
  enablePackageOrders,
  posMode = false,
  initialTable,
  tableCount,
  pendingByTable,
  categories,
  products,
  customers,
}: OrderComposerOverlayProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [tableNumber, setTableNumber] = useState(initialTable ?? "1");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.is_active)
        .sort((a, b) =>
          a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.created_at.localeCompare(b.created_at),
        ),
    [categories],
  );

  const productsByCategory = useMemo(() => {
    const m: Record<string, Product[]> = {};
    for (const p of products) {
      if (!m[p.category_id]) m[p.category_id] = [];
      m[p.category_id]!.push(p);
    }
    for (const k of Object.keys(m)) {
      m[k]!.sort((a, b) =>
        a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.created_at.localeCompare(b.created_at),
      );
    }
    return m;
  }, [products]);

  const totalItems = useMemo(() => Object.values(quantities).reduce((s, n) => s + n, 0), [quantities]);
  const subtotal = useMemo(
    () => products.reduce((s, p) => s + (quantities[p.id] ?? 0) * effectiveOnlinePrice(p), 0),
    [products, quantities],
  );

  const tables = useMemo(() => Array.from({ length: tableCount }, (_, i) => String(i + 1)), [tableCount]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          String(c.delivery_address ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [customerQuery, customers]);

  function setQty(productId: string, next: number) {
    setQuantities((prev) => {
      const n = { ...prev };
      if (next <= 0) delete n[productId];
      else n[productId] = next;
      return n;
    });
  }

  function buildCartItems(): CartItem[] {
    const items: CartItem[] = [];
    for (const p of products) {
      const q = quantities[p.id] ?? 0;
      if (q <= 0) continue;
      items.push({
        lineId: `${p.id}::composer::${mode}`,
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

  function submit() {
    setErrorMessage(null);
    const cartItems = buildCartItems();
    if (cartItems.length === 0) {
      setErrorMessage("En az bir ürün seçin.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "table") {
          await createCashierTableOrder({
            tableNumber,
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
        const sep = closeHref.includes("?") ? "&" : "?";
        router.push(`${closeHref}${sep}saved=1&savedMode=${mode}${posMode ? "&pos=1" : ""}`);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Sipariş kaydedilemedi.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/50 p-2 md:p-4"
      onClick={() => router.push(closeHref)}
      role="presentation"
    >
      <div className="flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <p className="text-base font-semibold text-gray-900">
              {mode === "table" ? "Kasa Modu · Masa Siparişi" : "Kasa Modu · Paket Siparişi"}
            </p>
            <p className="text-xs text-gray-500">Panel kilitli — sipariş tamamlanana kadar bu çalışma alanındasınız</p>
          </div>
          <Link href={closeHref} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            Kapat
          </Link>
        </div>

        {errorMessage ? <p className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1fr_360px_320px]">
          <div className="min-h-0 overflow-auto p-4">
            {activeCategories.map((cat) => {
              const items = productsByCategory[cat.id] ?? [];
              if (!items.length) return null;
              return (
                <section key={cat.id} className="mb-6">
                  <h3 className="border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">{cat.name}</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((p) => {
                      const q = quantities[p.id] ?? 0;
                      return (
                        <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p> : null}
                          <p className="mt-2 text-sm font-semibold text-gray-900">{formatTry(effectiveOnlinePrice(p))}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" className="rounded-md border border-gray-300 px-2.5 py-1 text-sm" onClick={() => setQty(p.id, q - 1)}>−</button>
                            <span className="min-w-[2ch] text-center text-sm font-medium">{q}</span>
                            <button type="button" className="rounded-md border border-gray-300 px-2.5 py-1 text-sm" onClick={() => setQty(p.id, q + 1)}>+</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="min-h-0 border-t border-gray-200 p-4 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-semibold text-gray-900">Sepet</h3>
            <div className="mt-2 min-h-0 max-h-[50vh] space-y-2 overflow-auto rounded-lg border border-gray-200 p-2">
              {buildCartItems().length === 0 ? (
                <p className="text-xs text-gray-500">Henüz ürün eklenmedi.</p>
              ) : (
                buildCartItems().map((item) => (
                  <div key={item.lineId} className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1.5 text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <strong>{formatTry(item.quantity * item.price)}</strong>
                  </div>
                ))
              )}
            </div>
            <label className="mt-3 block text-xs font-medium text-gray-600">Sipariş notu</label>
            <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>{totalItems} kalem</span>
              <strong>{formatTry(subtotal)}</strong>
            </div>
            <button type="button" disabled={isPending || totalItems === 0} onClick={submit} className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? "Kaydediliyor…" : "Siparişi tamamla"}
            </button>
          </div>

          <div className="min-h-0 border-t border-gray-200 p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex flex-wrap gap-2">
              {enableTableOrders ? (
                <Link
                  href={switchTableHref ?? closeHref}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "table" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Masa Siparişi
                </Link>
              ) : null}
              {enablePackageOrders ? (
                <Link
                  href={switchPackageHref ?? closeHref}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "package" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  Paket Siparişi
                </Link>
              ) : null}
            </div>
            {mode === "table" ? (
              <>
                <h3 className="text-sm font-semibold text-gray-900">Masalar</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {tables.map((t) => {
                    const pending = pendingByTable[t] ?? 0;
                    const selected = tableNumber === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTableNumber(t)}
                        className={`relative rounded-lg border px-2 py-2 text-sm ${selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-800"}`}
                      >
                        Masa {t}
                        {pending > 0 ? <span className="absolute right-1 top-1 text-[10px]">{pending}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-900">Müşteri</h3>
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Telefon, isim veya adres ara"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 max-h-44 overflow-auto rounded-md border border-gray-200">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={() => {
                        setCustomerName(c.full_name);
                        setCustomerPhone(c.phone);
                        setCustomerAddress(c.delivery_address ?? "");
                      }}
                    >
                      <p className="font-medium text-gray-900">{c.full_name}</p>
                      <p className="text-xs text-gray-600">{c.phone} · {c.delivery_address ?? "-"}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ad soyad" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Telefon" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Adres (opsiyonel)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
