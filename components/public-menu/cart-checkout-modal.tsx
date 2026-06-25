"use client";

import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import CustomerIdentityAddressForm from "@/components/customer/customer-identity-address-form";
import {
  emptyCustomerFormValues,
  type CustomerFormValues,
  validateCustomerFormForFulfillment,
} from "@/lib/customer-address";
import { formatCourierLocationNoteLine } from "@/lib/maps-links";
import { appendLocalOrder, type LocalOrder, type LocalOrderLine } from "@/lib/local-orders";
import type { LocalMenuProduct } from "@/lib/local-menu";
import { getProductPriceForFulfillment } from "@/lib/product-pricing";
import {
  fulfillmentTypeLabel,
  resolveDefaultFulfillmentType,
  type FulfillmentType,
  type TenantFulfillmentFlags,
} from "@/lib/fulfillment";
import { upsertLocalCustomerByPhone } from "@/lib/local-customers";
import { loadQrCheckoutSession, saveQrCheckoutSession } from "@/lib/qr-checkout-session";
import {
  pickDefaultPaymentMethod,
  type CheckoutPaymentMethod,
  type MealCardBrandId,
  type TenantPaymentFlags,
  paymentMethodLabel,
} from "@/lib/tenant-payment";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

type CartEntry = {
  productId: string;
  qty: number;
  removedIngredients: string[];
};

type CartState = Record<string, CartEntry>;

type CartLine = {
  key: string;
  product: LocalMenuProduct;
  qty: number;
  removedIngredients: string[];
};

type Step = "cart" | "checkout";

type CartCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  cart: CartState;
  setCart: React.Dispatch<React.SetStateAction<CartState>>;
  visibleProducts: LocalMenuProduct[];
  paymentFlags: TenantPaymentFlags;
  fulfillmentFlags: TenantFulfillmentFlags;
  orderSource?: "qr_menu" | "marketplace";
  /** Menü subdomain (işletme kimliği) */
  subdomain: string;
  orderingEnabled: boolean;
  closedMessage: string;
};

export default function CartCheckoutModal({
  open,
  onClose,
  cart,
  setCart,
  visibleProducts,
  paymentFlags,
  fulfillmentFlags,
  orderSource = "qr_menu",
  subdomain,
  orderingEnabled,
  closedMessage,
}: CartCheckoutModalProps) {
  const baseId = useId();
  const defaultFulfillment = resolveDefaultFulfillmentType(fulfillmentFlags);
  const [step, setStep] = useState<Step>("cart");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(defaultFulfillment ?? "pickup");
  const [customerLatitude, setCustomerLatitude] = useState<number | null>(null);
  const [customerLongitude, setCustomerLongitude] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<CustomerFormValues>(() => emptyCustomerFormValues());
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">("");
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">("");
  const [locLoading, setLocLoading] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hydrateCheckout = useCallback(() => {
    const session = loadQrCheckoutSession(subdomain);
    const base = emptyCustomerFormValues();
    setFormValues({
      ...base,
      firstName: session.firstName ?? "",
      lastName: session.lastName ?? "",
      phone: session.phone ?? "",
      email: session.email ?? "",
      neighborhood: session.neighborhood ?? "",
      street: session.street ?? "",
      buildingNo: session.buildingNo ?? "",
      buildingName: session.buildingName ?? "",
      floor: session.floor ?? "",
      apartmentNo: session.apartmentNo ?? "",
      livesInSite: session.livesInSite === true,
      siteName: session.siteName ?? "",
      block: session.block ?? "",
      orderNote: "",
    });
    const picked = pickDefaultPaymentMethod(paymentFlags, session.lastPaymentMethod ?? "");
    setPayMethod(picked);
    setMealBrand(
      picked === "meal_card" && session.lastMealCardBrandId ? session.lastMealCardBrandId : "",
    );
    setLocMsg(null);
  }, [paymentFlags, subdomain]);

  useEffect(() => {
    if (!open) return;
    setStep("cart");
  }, [open]);

  useEffect(() => {
    if (!open || step !== "checkout") return;
    hydrateCheckout();
  }, [open, step, hydrateCheckout]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cartLines: CartLine[] = useMemo(() => {
    const lines: CartLine[] = [];
    for (const [key, entry] of Object.entries(cart)) {
      if (entry.qty <= 0) continue;
      const product = visibleProducts.find((p) => p.id === entry.productId);
      if (product) {
        lines.push({
          key,
          product,
          qty: entry.qty,
          removedIngredients: entry.removedIngredients,
        });
      }
    }
    return lines;
  }, [cart, visibleProducts]);

  const cartTotal = cartLines.reduce(
    (s, l) => s + getProductPriceForFulfillment(l.product, fulfillmentType) * l.qty,
    0,
  );

  const showFulfillmentChoice =
    fulfillmentFlags.fulfillmentPickupEnabled && fulfillmentFlags.fulfillmentDeliveryEnabled;

  const upsellProducts = useMemo(() => {
    const inCart = new Set(
      Object.entries(cart)
        .filter(([, entry]) => entry.qty > 0)
        .map(([, entry]) => entry.productId),
    );
    return visibleProducts.filter((p) => p.checkoutUpsell && !inCart.has(p.id));
  }, [visibleProducts, cart]);

  function adjustQty(cartKey: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const cur = next[cartKey]?.qty ?? 0;
      const q = cur + delta;
      if (q <= 0) delete next[cartKey];
      else next[cartKey] = { ...next[cartKey], qty: q };
      return next;
    });
  }

  function addUpsell(productId: string) {
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    setCart((c) => ({
      ...c,
      [productId]: {
        productId,
        qty: (c[productId]?.qty ?? 0) + 1,
        removedIngredients: c[productId]?.removedIngredients ?? [],
      },
    }));
  }

  function clearCart() {
    setCart({});
    onClose();
  }

  function handleRequestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocMsg("Bu cihaz konum paylaşımını desteklemiyor.");
      return;
    }
    setLocLoading(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCustomerLatitude(latitude);
        setCustomerLongitude(longitude);
        const line = formatCourierLocationNoteLine(latitude, longitude);
        setFormValues((v) => ({
          ...v,
          orderNote: v.orderNote.trim() ? `${v.orderNote.trim()}\n\n${line}` : line,
        }));
        setLocMsg("Konum alındı. Teslimat mesafesi siparişte doğrulanır.");
        setLocLoading(false);
      },
      () => {
        setLocMsg("Konum alınamadı; tarayıcı iznini kontrol edin.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  async function handleConfirmOrder() {
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }
    const err = validateCustomerFormForFulfillment(formValues, fulfillmentType);
    if (err) {
      window.alert(err);
      return;
    }
    if (fulfillmentType === "delivery" && (customerLatitude == null || customerLongitude == null)) {
      window.alert("Teslimat için «Konum al» ile adresinizi paylaşın.");
      return;
    }
    if (!payMethod) {
      window.alert("Lütfen bir ödeme yöntemi seçin.");
      return;
    }
    if (payMethod === "meal_card") {
      if (!mealBrand) {
        window.alert("Lütfen yemek kartı türünü seçin.");
        return;
      }
    }

    const addr = {
      neighborhood: formValues.neighborhood.trim(),
      street: formValues.street.trim(),
      buildingNo: formValues.buildingNo.trim(),
      buildingName: formValues.buildingName.trim(),
      floor: formValues.floor.trim(),
      apartmentNo: formValues.apartmentNo.trim(),
      livesInSite: formValues.livesInSite,
      siteName: formValues.siteName.trim(),
      block: formValues.block.trim(),
    };

    const lines: LocalOrderLine[] = cartLines.map(({ product: p, qty, removedIngredients }) => ({
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: getProductPriceForFulfillment(p, fulfillmentType),
      removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
    }));

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          orderSource,
          fulfillmentType,
          lines,
          total: cartTotal,
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          phone: formValues.phone.trim(),
          email: formValues.email.trim(),
          address: addr,
          customerLatitude: fulfillmentType === "delivery" ? customerLatitude : null,
          customerLongitude: fulfillmentType === "delivery" ? customerLongitude : null,
          paymentMethod: payMethod,
          mealCardBrandId: payMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
          orderNote: formValues.orderNote.trim(),
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        orderCode?: string;
        error?: string;
      };

      if (!response.ok || !result.ok || !result.orderCode) {
        window.alert(result.error ?? "Sipariş kaydedilemedi.");
        return;
      }

      const order: LocalOrder = {
        id: result.orderCode,
      subdomain: subdomain.toLowerCase(),
      createdAt: new Date().toISOString(),
      orderSource: "qr_menu",
        lines,
        total: cartTotal,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
        address: addr,
        paymentMethod: payMethod,
        mealCardBrandId: payMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
        orderNote: formValues.orderNote.trim(),
      };

      appendLocalOrder(subdomain, order);
      upsertLocalCustomerByPhone(subdomain, {
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        email: order.email,
        address: addr,
        orderSource: "qr_menu",
        lastPaymentMethod: payMethod,
        lastMealCardBrandId: payMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
      });
      saveQrCheckoutSession(
        subdomain,
        formValues,
        payMethod === "meal_card"
          ? { method: payMethod, mealCardBrandId: mealBrand as MealCardBrandId }
          : { method: payMethod },
      );

      setCart({});
      onClose();
      window.alert(
        `Siparişiniz alındı.\nNo: ${order.id}\nÖdeme: ${paymentMethodLabel(payMethod, mealBrand || undefined)}`,
      );
    } catch {
      window.alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const title = step === "cart" ? "Sepetiniz" : "Siparişi tamamla";

  return (
    <div
      className="fixed inset-0 z-[190] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-container-high px-5 py-4">
          <div className="flex items-center gap-2">
            {step === "checkout" ? (
              <button
                type="button"
                onClick={() => setStep("cart")}
                className="rounded-xl p-2 text-secondary hover:bg-surface-container-low hover:text-on-background"
                aria-label="Sepete dön"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
            ) : null}
            <h2 id={`${baseId}-title`} className="font-headline text-lg font-bold text-on-background">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-secondary hover:bg-surface-container-low hover:text-on-background"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {step === "cart" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {!orderingEnabled ? (
                <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
                  {closedMessage}
                </p>
              ) : null}
              {cartLines.length === 0 ? (
                <p className="rounded-2xl bg-surface-container-low px-4 py-8 text-center text-sm text-secondary">
                  Sepetiniz boş. Menüden ürün ekleyin.
                </p>
              ) : (
                <ul className="space-y-3">
                  {cartLines.map(({ key, product: p, qty, removedIngredients }) => (
                    <li
                      key={key}
                      className="flex gap-3 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-3"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
                        {p.imageDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-secondary/50">
                            <span className="material-symbols-outlined text-2xl">restaurant</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-headline text-sm font-bold text-on-background line-clamp-2">{p.name}</p>
                        <p className="mt-0.5 text-xs font-black text-primary">
                          {formatTry(getProductPriceForFulfillment(p, fulfillmentType))}
                        </p>
                        {removedIngredients.length > 0 ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-secondary">
                            Çıkarılacak: {removedIngredients.join(", ")}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustQty(key, -1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-container-highest bg-white text-on-background transition active:scale-95"
                            aria-label="Adet azalt"
                          >
                            <span className="material-symbols-outlined text-lg">remove</span>
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums">{qty}</span>
                          <button
                            type="button"
                            onClick={() => adjustQty(key, 1)}
                            disabled={!orderingEnabled}
                            className={[
                              "flex h-9 w-9 items-center justify-center rounded-xl transition",
                              orderingEnabled
                                ? "bg-primary-container text-white active:scale-95"
                                : "cursor-not-allowed bg-surface-container-high text-secondary",
                            ].join(" ")}
                            aria-label="Adet artır"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {cartLines.length > 0 && upsellProducts.length > 0 ? (
                <section className="mt-6">
                  <h3 className="mb-3 flex items-center gap-2 font-headline text-sm font-bold text-on-background">
                    <span className="material-symbols-outlined text-primary text-[20px]">recommend</span>
                    İyi gider
                  </h3>
                  <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pl-1 pr-1 scrollbar-thin">
                    {upsellProducts.map((p) => (
                      <div
                        key={p.id}
                        className="w-[140px] shrink-0 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-2 shadow-sm"
                      >
                        <div className="relative mb-2 h-20 overflow-hidden rounded-xl bg-surface-container-low">
                          {p.imageDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageDataUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-secondary/40">
                              <span className="material-symbols-outlined text-3xl">restaurant</span>
                            </div>
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs font-bold text-on-background">{p.name}</p>
                        <p className="mt-1 text-[11px] font-black text-primary">
                          {formatTry(getProductPriceForFulfillment(p, fulfillmentType))}
                        </p>
                        <button
                          type="button"
                          onClick={() => addUpsell(p.id)}
                          disabled={!orderingEnabled}
                          className={[
                            "mt-2 w-full rounded-xl py-2 text-xs font-bold",
                            orderingEnabled
                              ? "bg-primary text-white hover:bg-primary-container"
                              : "cursor-not-allowed bg-surface-container-high text-secondary",
                          ].join(" ")}
                        >
                          {orderingEnabled ? "Ekle" : "Kapalı"}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
              {cartLines.length > 0 ? (
                <>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-secondary">Ara toplam</span>
                    <span className="font-headline text-lg font-black text-on-background">{formatTry(cartTotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("checkout")}
                    disabled={!orderingEnabled}
                    className="w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]"
                  >
                    {orderingEnabled ? "Devam et" : "Restoran kapalı"}
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="mt-2 w-full rounded-xl border border-surface-container-highest py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container-low hover:text-on-background"
                  >
                    Sepeti boşalt
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl border border-surface-container-highest bg-white py-3 text-sm font-semibold text-on-background hover:bg-surface-container-low"
                >
                  Menüye dön
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {!orderingEnabled ? (
                <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
                  {closedMessage}
                </p>
              ) : null}
              <p className="text-xs text-secondary">
                Bilgilerinizi girin, ödeme yöntemini seçin ve siparişi onaylayın. Veriler bu cihazda saklanır; bir
                sonraki siparişinizde hızlanır.
              </p>
              <div className="mt-4 rounded-xl border border-surface-container-high bg-surface-container-low/50 px-3 py-2 text-xs">
                <span className="font-semibold text-on-background">Ara toplam:</span>{" "}
                <span className="font-headline font-black text-primary">{formatTry(cartTotal)}</span>
              </div>

              <div className="mt-6">
                {(showFulfillmentChoice || fulfillmentFlags.fulfillmentPickupEnabled || fulfillmentFlags.fulfillmentDeliveryEnabled) ? (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sipariş tipi</p>
                    {showFulfillmentChoice ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(["pickup", "delivery"] as FulfillmentType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFulfillmentType(type)}
                            className={[
                              "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                              fulfillmentType === type
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-surface-container-highest bg-white text-secondary",
                            ].join(" ")}
                          >
                            {fulfillmentTypeLabel(type)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-on-background">
                        {fulfillmentTypeLabel(fulfillmentType)}
                      </p>
                    )}
                    {fulfillmentType === "delivery" && fulfillmentFlags.fulfillmentDeliveryEnabled ? (
                      <p className="mt-2 text-[11px] text-secondary">
                        Teslimat yarıçapı: {fulfillmentFlags.deliveryRadiusKm} km — «Konum al» zorunludur.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <CustomerIdentityAddressForm
                  idPrefix={`${baseId}-co`}
                  values={formValues}
                  onChange={setFormValues}
                  showPrefillNotice
                  showOrderNote
                  hideAddress={fulfillmentType === "pickup"}
                  showLocationButton={fulfillmentType === "delivery"}
                  locationLoading={locLoading}
                  locationMessage={locMsg}
                  onRequestLocation={handleRequestLocation}
                />
              </div>

              <div className="mt-8">
                <CheckoutPaymentSelector
                  options={paymentFlags}
                  method={payMethod}
                  mealCardBrandId={mealBrand}
                  onMethodChange={(m) => {
                    setPayMethod(m);
                    if (m !== "meal_card") setMealBrand("");
                  }}
                  onMealCardBrandChange={setMealBrand}
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={submitting || !orderingEnabled}
                className="w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Sipariş kaydediliyor…" : orderingEnabled ? "Siparişi onayla" : "Restoran kapalı"}
              </button>
              <button
                type="button"
                onClick={() => setStep("cart")}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border border-surface-container-highest py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container-low hover:text-on-background"
              >
                Sepete dön
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
