"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatTry, useTenantCart } from "../../../../../features/menu";
import { createOrderFromCheckout, DELIVERY_FEE_TRY } from "../../../../../features/orders";
import type { OrderChannel } from "../../../../../types";

type OrderType = "table" | "delivery" | "pickup";
type PaymentMethod = "cash" | "card";

type TenantCheckoutClientProps = {
  tenantSlug: string;
  initialMode?: "online" | "table" | "package";
  initialTableNumber?: string;
};

function defaultOrderType(mode: "online" | "table" | "package"): OrderType {
  if (mode === "table") return "table";
  if (mode === "package") return "pickup";
  return "pickup";
}

function defaultOrderChannel(mode: "online" | "table" | "package"): OrderChannel {
  if (mode === "table") return "table";
  if (mode === "package") return "package";
  return "online";
}

export function TenantCheckoutClient({
  tenantSlug,
  initialMode = "online",
  initialTableNumber = "",
}: TenantCheckoutClientProps) {
  const { cartItems, clearCart, subtotal, totalQuantity } = useTenantCart(tenantSlug);
  const [orderType, setOrderType] = useState<OrderType>(defaultOrderType(initialMode));
  const [orderChannel, setOrderChannel] = useState<OrderChannel>(defaultOrderChannel(initialMode));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [tableNumberValue, setTableNumberValue] = useState(initialTableNumber);
  const [customerNameValue, setCustomerNameValue] = useState("");
  const [customerPhoneValue, setCustomerPhoneValue] = useState("");
  const [deliveryAddressValue, setDeliveryAddressValue] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const modeLocked = initialMode !== "online";
  const profileStorageKey = `kendisepetim:checkout-profile:${tenantSlug}`;
  const addressStorageKey = `kendisepetim:checkout-address:${tenantSlug}`;

  const deliveryFee = useMemo(
    () => (orderType === "delivery" ? DELIVERY_FEE_TRY : 0),
    [orderType],
  );
  const total = subtotal + deliveryFee;

  useEffect(() => {
    try {
      const profileRaw = window.localStorage.getItem(profileStorageKey);
      if (profileRaw) {
        const profile = JSON.parse(profileRaw) as { customerName?: string; customerPhone?: string };
        setCustomerNameValue(profile.customerName ?? "");
        setCustomerPhoneValue(profile.customerPhone ?? "");
      }
      const savedAddress = window.localStorage.getItem(addressStorageKey);
      if (savedAddress) {
        setDeliveryAddressValue(savedAddress);
        setSaveAddress(true);
      }
    } catch {
      // ignore parse errors in client cache
    }
  }, [addressStorageKey, profileStorageKey]);

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
          orderChannel,
          paymentMethod,
          customerName,
          customerPhone,
          deliveryAddress,
          tableNumber,
          orderNote,
          cartItems,
        });

        if (result.ok) {
          window.localStorage.setItem(
            profileStorageKey,
            JSON.stringify({ customerName, customerPhone }),
          );
          if (saveAddress && deliveryAddress.trim()) {
            window.localStorage.setItem(addressStorageKey, deliveryAddress.trim());
          } else if (!saveAddress) {
            window.localStorage.removeItem(addressStorageKey);
          }
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
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Siparis Bilgileri</h2>
        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Siparis tipi</p>
          {modeLocked ? (
            <p className="text-sm text-gray-700">
              {initialMode === "table"
                ? "Masa Siparişi"
                : initialMode === "package"
                  ? "Paket Siparişi"
                  : "Online Sipariş"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(["table", "delivery", "pickup"] as OrderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrderType(type);
                    setOrderChannel(type === "table" ? "table" : "online");
                  }}
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
          )}
          {initialMode === "package" ? (
            <p className="text-xs text-gray-500">
              Paket siparişlerde ürünlerde tanımlıysa <code>delivery_price</code> kullanılır.
            </p>
          ) : null}
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
              value={customerNameValue}
              onChange={(e) => setCustomerNameValue(e.target.value)}
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
              value={customerPhoneValue}
              onChange={(e) => setCustomerPhoneValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {orderType === "delivery" && orderChannel !== "package" ? (
          <div>
            <label htmlFor="delivery_address" className="mb-1 block text-sm font-medium text-gray-700">
              Adres
            </label>
            <textarea
              id="delivery_address"
              name="delivery_address"
              required
              rows={3}
              value={deliveryAddressValue}
              onChange={(e) => setDeliveryAddressValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                Sonraki sipariş için adresi kaydet
              </label>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setErrorMessage("Tarayıcı konum desteği sunmuyor.");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const nextValue = `Konum: ${pos.coords.latitude}, ${pos.coords.longitude}`;
                      setDeliveryAddressValue(nextValue);
                    },
                    () => setErrorMessage("Konum alınamadı. Lütfen izin verip tekrar deneyin."),
                    { enableHighAccuracy: true, timeout: 10000 },
                  );
                }}
              >
                Tam konum al
              </button>
            </div>
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
              value={tableNumberValue}
              onChange={(e) => setTableNumberValue(e.target.value)}
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
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black sm:w-auto"
        >
          {isPending ? "Olusturuluyor..." : "Siparisi Tamamla"}
        </button>
      </form>

      <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-4">
        <h2 className="text-base font-semibold text-gray-900">Siparis Ozeti</h2>
        <p className="mt-1 text-xs text-gray-500">{totalQuantity} adet urun</p>

        <div className="mt-4 space-y-2">
          {cartItems.map((item) => (
            <div key={item.lineId} className="rounded-md border border-gray-100 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium text-gray-900">{formatTry(item.price * item.quantity)}</span>
              </div>
              {item.removedIngredients && item.removedIngredients.length > 0 ? (
                <p className="mt-1 text-xs text-gray-500">Çıkarılan: {item.removedIngredients.join(", ")}</p>
              ) : null}
              {item.addedIngredients && item.addedIngredients.length > 0 ? (
                <p className="mt-1 text-xs text-gray-500">Eklenen: {item.addedIngredients.join(", ")}</p>
              ) : null}
              {item.itemNote ? <p className="mt-1 text-xs text-gray-500">Not: {item.itemNote}</p> : null}
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
