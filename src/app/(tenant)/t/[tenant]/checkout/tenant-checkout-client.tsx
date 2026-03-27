"use client";

import { useMemo, useState, useTransition } from "react";
import { formatTry, useTenantCart } from "../../../../../features/menu";
import { createOrderFromCheckout, DELIVERY_FEE_TRY } from "../../../../../features/orders";

type OrderType = "table" | "delivery" | "pickup";
type PaymentMethod = "cash" | "card";

type TenantCheckoutClientProps = {
  tenantSlug: string;
};

export function TenantCheckoutClient({ tenantSlug }: TenantCheckoutClientProps) {
  const { cartItems, clearCart, subtotal, totalQuantity } = useTenantCart(tenantSlug);
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const deliveryFee = useMemo(
    () => (orderType === "delivery" ? DELIVERY_FEE_TRY : 0),
    [orderType],
  );
  const total = subtotal + deliveryFee;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cartItems.length === 0) return;
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const customerName = String(formData.get("customer_name") ?? "");
    const customerPhone = String(formData.get("customer_phone") ?? "");
    const deliveryAddress = String(formData.get("delivery_address") ?? "");
    const tableNumber = String(formData.get("table_number") ?? "");
    const orderNote = String(formData.get("order_note") ?? "");

    startTransition(async () => {
      try {
        const result = await createOrderFromCheckout({
          tenantSlug,
          orderType,
          paymentMethod,
          customerName,
          customerPhone,
          deliveryAddress,
          tableNumber,
          orderNote,
          cartItems,
        });

        if (result.ok) {
          setCreatedOrderId(result.orderId);
          setSubmitted(true);
          clearCart();
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Siparis olusturulurken bir hata olustu.",
        );
      }
    });
  }

  if (submitted) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-semibold text-emerald-800">Siparis alindi</h2>
        <p className="mt-1 text-sm text-emerald-700">
          Siparisiniz restorana iletildi. Kisa sure icinde durum bilgisi paylasilacaktir.
        </p>
        {createdOrderId ? (
          <p className="mt-2 text-xs text-emerald-700">Siparis no: {createdOrderId}</p>
        ) : null}
      </section>
    );
  }

  if (cartItems.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-600">Checkout icin once sepete urun eklemelisiniz.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Siparis Bilgileri</h2>
        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Siparis tipi</p>
          <div className="flex flex-wrap gap-2">
            {(["table", "delivery", "pickup"] as OrderType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  orderType === type
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {type === "table" ? "Masa" : type === "delivery" ? "Paket" : "Gel-al"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="customer_name" className="mb-1 block text-sm font-medium text-gray-700">
              Musteri adi
            </label>
            <input
              id="customer_name"
              name="customer_name"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="customer_phone" className="mb-1 block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              id="customer_phone"
              name="customer_phone"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {orderType === "delivery" ? (
          <div>
            <label htmlFor="delivery_address" className="mb-1 block text-sm font-medium text-gray-700">
              Adres
            </label>
            <textarea
              id="delivery_address"
              name="delivery_address"
              required
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        {orderType === "table" ? (
          <div>
            <label htmlFor="table_number" className="mb-1 block text-sm font-medium text-gray-700">
              Masa numarasi
            </label>
            <input
              id="table_number"
              name="table_number"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Odeme yontemi</p>
          <div className="flex gap-2">
            {(["cash", "card"] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  paymentMethod === method
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {method === "cash" ? "Nakit" : "Kart"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Online odeme bu MVP kapsamina dahil degildir.
          </p>
        </div>

        <div>
          <label htmlFor="order_note" className="mb-1 block text-sm font-medium text-gray-700">
            Siparis notu (opsiyonel)
          </label>
          <textarea
            id="order_note"
            name="order_note"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          {isPending ? "Olusturuluyor..." : "Siparisi Tamamla"}
        </button>
      </form>

      <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-4">
        <h2 className="text-base font-semibold text-gray-900">Siparis Ozeti</h2>
        <p className="mt-1 text-xs text-gray-500">{totalQuantity} adet urun</p>

        <div className="mt-4 space-y-2">
          {cartItems.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium text-gray-900">
                {formatTry(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm">
          <div className="flex items-center justify-between text-gray-700">
            <span>Ara Toplam</span>
            <span>{formatTry(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-700">
            <span>Teslimat</span>
            <span>{formatTry(deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-gray-900">
            <span>Genel Toplam</span>
            <span>{formatTry(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
