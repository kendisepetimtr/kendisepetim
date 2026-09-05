"use client";

import { useEffect, useMemo, useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import CustomerIdentityAddressForm from "@/components/customer/customer-identity-address-form";
import {
  emptyCustomerFormValues,
  formValuesToAddress,
  validateCustomerFormForFulfillment,
  type CustomerFormValues,
} from "@/lib/customer-address";
import type { FulfillmentType } from "@/lib/fulfillment";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { formatDailyOrderLabel } from "@/lib/order-daily-number";
import { formatCashierPhonePreview, type CashierCustomerMatch } from "@/lib/kasa/customer-search";
import { receiptSettingsForKasaChannel } from "@/lib/kasa/receipt-channel";
import {
  parseIngredientLines,
  sortCategoriesForMenu,
  type LocalMenuProduct,
  type LocalMenuState,
} from "@/lib/local-menu";
import {
  formatSelectedVariationLabels,
  hasVariations,
  sumVariationDeltas,
  type SelectedVariation,
  type VariationGroup,
  type VariationOption,
} from "@/lib/menu-variations";
import {
  buildCartKey,
  buildCartLines,
  type CartState,
} from "@/lib/public-cart";
import { getProductPriceForFulfillmentWithVariations } from "@/lib/product-pricing";
import { fetchKasaReceiptPrintOptions, printThermalReceipt } from "@/lib/receipt-print";
import type { ReceiptOrderData } from "@/lib/receipt-template";
import { getPrimaryPublicMenuUrl } from "@/lib/public-menu-urls";
import {
  pickDefaultPaymentMethod,
  paymentMethodLabel,
  type CheckoutPaymentMethod,
  type MealCardBrandId,
  type TenantPaymentFlags,
} from "@/lib/tenant-payment";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

function formatDelta(delta: number): string {
  if (!delta) return "";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatTry(delta)}`;
}

export type KasaOrderModalProps = {
  open: boolean;
  onClose: () => void;
  channel: FulfillmentType;
  /** dine_in için zorunlu */
  tableNumber?: number;
  title?: string;
  businessName: string;
  subdomain: string;
  menu: LocalMenuState;
  /** Paket/gel-al ödeme beyanı için */
  paymentFlags?: TenantPaymentFlags;
  onOrderPlaced?: () => void;
  /** Varsayılan: /api/kasa/orders — garson için /api/garson/orders */
  ordersEndpoint?: string;
  /** Garson paneli fiş basmaz */
  skipPrint?: boolean;
};

export default function KasaOrderModal({
  open,
  onClose,
  channel,
  tableNumber,
  title,
  businessName,
  subdomain,
  menu,
  paymentFlags,
  onOrderPlaced,
  ordersEndpoint = "/api/kasa/orders",
  skipPrint = false,
}: KasaOrderModalProps) {
  const categories = useMemo(
    () => sortCategoriesForMenu(menu.categories.filter((c) => !c.hidden)),
    [menu.categories],
  );
  const products = useMemo(() => menu.products.filter((p) => !p.hidden), [menu.products]);
  const needsDeclaredPayment = channel === "delivery";
  const resolvedPaymentFlags = useMemo<TenantPaymentFlags>(
    () =>
      paymentFlags ?? {
        paymentCash: true,
        paymentDoorCard: false,
        paymentMealCard: false,
        paymentHavale: true,
        mealCardBrandIds: [],
      },
    [paymentFlags],
  );

  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartState>({});
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customize, setCustomize] = useState<LocalMenuProduct | null>(null);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<SelectedVariation[]>([]);
  const [lineNoteDraft, setLineNoteDraft] = useState("");
  const [customer, setCustomer] = useState<CustomerFormValues>(() => emptyCustomerFormValues());
  const [phoneSuggestions, setPhoneSuggestions] = useState<CashierCustomerMatch[]>([]);
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false);
  const [phoneSearching, setPhoneSearching] = useState(false);
  /** Paket: ürün seç → müşteri bilgisi (üstte sabit form yok) */
  const [step, setStep] = useState<"menu" | "customer">("menu");
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(resolvedPaymentFlags, ""),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">("");

  const headerTitle =
    title ??
    (channel === "dine_in"
      ? `Masa ${tableNumber}`
      : channel === "pickup"
        ? "Gel-Al"
        : "Paket");

  useEffect(() => {
    if (!open) return;
    setCart({});
    setOrderNote("");
    setCategoryId("all");
    setCustomize(null);
    setLineNoteDraft("");
    setCustomer(emptyCustomerFormValues());
    setPhoneSuggestions([]);
    setPhoneSuggestOpen(false);
    setPhoneSearching(false);
    setStep("menu");
    setPayMethod(pickDefaultPaymentMethod(resolvedPaymentFlags, ""));
    setMealBrand("");
  }, [open, tableNumber, channel, resolvedPaymentFlags]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || channel !== "delivery" || step !== "customer") return;
    const phone = customer.phone.trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 3) {
      setPhoneSuggestions([]);
      setPhoneSuggestOpen(false);
      setPhoneSearching(false);
      return;
    }
    let cancelled = false;
    setPhoneSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/kasa/customers/search?q=${encodeURIComponent(phone)}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = (await res.json()) as { ok?: boolean; matches?: CashierCustomerMatch[] };
          if (cancelled) return;
          if (res.ok && data.ok && data.matches) {
            setPhoneSuggestions(data.matches);
            setPhoneSuggestOpen(data.matches.length > 0);
          } else {
            setPhoneSuggestions([]);
            setPhoneSuggestOpen(false);
          }
        } catch {
          if (!cancelled) {
            setPhoneSuggestions([]);
            setPhoneSuggestOpen(false);
          }
        } finally {
          if (!cancelled) setPhoneSearching(false);
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customer.phone, open, channel, step]);

  function applyCustomerMatch(m: CashierCustomerMatch) {
    setCustomer((v) => ({
      ...v,
      phone: m.phone,
      firstName: m.firstName || v.firstName,
      lastName: m.lastName || v.lastName,
      neighborhood: m.address.neighborhood || v.neighborhood,
      street: m.address.street || v.street,
      buildingNo: m.address.buildingNo || v.buildingNo,
      buildingName: m.address.buildingName || v.buildingName,
      floor: m.address.floor || v.floor,
      apartmentNo: m.address.apartmentNo || v.apartmentNo,
      livesInSite: m.address.livesInSite,
      siteName: m.address.siteName || v.siteName,
      block: m.address.block || v.block,
    }));
    setPhoneSuggestOpen(false);
  }

  function addressPreview(m: CashierCustomerMatch): string {
    return [m.address.neighborhood, m.address.street, m.address.buildingNo && `No:${m.address.buildingNo}`]
      .filter(Boolean)
      .join(" · ");
  }

  const visibleProducts = useMemo(() => {
    if (categoryId === "all") return products;
    return products.filter((p) => p.categoryId === categoryId);
  }, [products, categoryId]);

  const cartLines = useMemo(() => buildCartLines(cart, products), [cart, products]);
  const cartTotal = cartLines.reduce(
    (s, l) =>
      s +
      getProductPriceForFulfillmentWithVariations(l.product, channel, l.selectedOptions) * l.qty,
    0,
  );
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function openProduct(product: LocalMenuProduct) {
    const needsDetail =
      hasVariations(product.variationGroups) || parseIngredientLines(product.ingredients).length > 0;
    if (!needsDetail) {
      addToCart(product, [], [], "");
      return;
    }
    const defaults: SelectedVariation[] = [];
    for (const group of product.variationGroups) {
      if (group.type === "single" && group.required) {
        const opt = group.options[0];
        if (opt) {
          defaults.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionLabel: opt.label,
            priceDelta: opt.priceDelta,
          });
        }
      }
    }
    setCustomize(product);
    setSelectedOptions(defaults);
    setRemovedIngredients([]);
    setLineNoteDraft("");
  }

  function addToCart(
    product: LocalMenuProduct,
    removed: string[],
    options: SelectedVariation[],
    note: string,
  ) {
    const key = buildCartKey(product.id, removed, options);
    const noteKey = note.trim() ? `${key}::note:${note.trim()}` : key;
    setCart((c) => {
      const prev = c[noteKey];
      return {
        ...c,
        [noteKey]: {
          productId: product.id,
          qty: (prev?.qty ?? 0) + 1,
          removedIngredients: removed,
          selectedOptions: options,
        },
      };
    });
    if (note.trim()) {
      setOrderNote((n) => {
        const line = `${product.name}: ${note.trim()}`;
        return n.trim() ? `${n.trim()}\n${line}` : line;
      });
    }
    setCustomize(null);
  }

  function adjustQty(key: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const cur = next[key];
      if (!cur) return c;
      const q = cur.qty + delta;
      if (q <= 0) delete next[key];
      else next[key] = { ...cur, qty: q };
      return next;
    });
  }

  function selectSingle(group: VariationGroup, option: VariationOption) {
    setSelectedOptions((prev) => {
      const rest = prev.filter((o) => o.groupId !== group.id);
      return [
        ...rest,
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionLabel: option.label,
          priceDelta: option.priceDelta,
        },
      ];
    });
  }

  function toggleMulti(group: VariationGroup, option: VariationOption) {
    setSelectedOptions((prev) => {
      const exists = prev.some((o) => o.groupId === group.id && o.optionId === option.id);
      if (exists) return prev.filter((o) => !(o.groupId === group.id && o.optionId === option.id));
      return [
        ...prev,
        {
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionLabel: option.label,
          priceDelta: option.priceDelta,
        },
      ];
    });
  }

  async function handleComplete() {
    if (cartLines.length === 0) {
      window.alert("Sepete ürün ekleyin.");
      return;
    }
    if (channel === "dine_in" && (tableNumber == null || tableNumber < 1)) {
      window.alert("Masa seçilmedi.");
      return;
    }
    if (channel === "delivery" && step === "menu") {
      setStep("customer");
      return;
    }
    if (channel === "delivery") {
      const err = validateCustomerFormForFulfillment(customer, "delivery");
      if (err) {
        window.alert(err);
        setStep("customer");
        return;
      }
    }
    if (needsDeclaredPayment) {
      if (!payMethod) {
        window.alert("Ödeme yöntemi seçin.");
        if (channel === "delivery") setStep("customer");
        return;
      }
      if (payMethod === "meal_card" && !mealBrand) {
        window.alert("Yemek kartı markası seçin.");
        if (channel === "delivery") setStep("customer");
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const line of cartLines) {
        for (const group of line.product.variationGroups) {
          if (group.type === "single" && group.required) {
            const ok = line.selectedOptions.some((o) => o.groupId === group.id);
            if (!ok) {
              window.alert(`${line.product.name}: «${group.name}» seçimi zorunlu.`);
              setSubmitting(false);
              return;
            }
          }
        }
      }

      const lines = cartLines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        qty: l.qty,
        unitPrice: getProductPriceForFulfillmentWithVariations(l.product, channel, l.selectedOptions),
        removedIngredients: l.removedIngredients.length > 0 ? l.removedIngredients : undefined,
        selectedOptions: l.selectedOptions.length > 0 ? l.selectedOptions : undefined,
      }));

      const response = await fetch(ordersEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fulfillmentType: channel,
          tableNumber: channel === "dine_in" ? tableNumber : undefined,
          lines,
          orderNote: orderNote.trim(),
          courierNote: channel === "delivery" ? customer.courierNote.trim() : "",
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim(),
          address: formValuesToAddress(customer),
          paymentMethod: needsDeclaredPayment && payMethod ? payMethod : undefined,
          mealCardBrandId:
            needsDeclaredPayment && payMethod === "meal_card" && mealBrand ? mealBrand : undefined,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        orderId?: string;
        orderCode?: string;
        dailyNumber?: number | null;
        error?: string;
      };
      if (!response.ok || !result.ok || !result.orderCode) {
        window.alert(result.error ?? "Sipariş kaydedilemedi.");
        return;
      }

      if (!skipPrint) {
        const fulfillmentLabel =
          channel === "dine_in"
            ? `Masa ${tableNumber}`
            : fulfillmentTypeLabel(channel);

        const receipt: ReceiptOrderData = {
          businessName,
          subdomain,
          menuUrl: getPrimaryPublicMenuUrl(subdomain),
          orderCode: result.orderCode,
          dailyNumber: result.dailyNumber ?? null,
          dailyLabel: formatDailyOrderLabel(result.dailyNumber, channel, tableNumber),
          createdAt: new Date().toISOString(),
          fulfillmentType: channel,
          fulfillmentLabel,
          customerName:
            channel !== "dine_in"
              ? [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || undefined
              : undefined,
          customerPhone: channel !== "dine_in" ? customer.phone.trim() || undefined : undefined,
          customerAddress:
            channel === "delivery"
              ? [
                  customer.neighborhood,
                  customer.street,
                  customer.buildingNo && `No:${customer.buildingNo}`,
                  customer.apartmentNo && `D:${customer.apartmentNo}`,
                ]
                  .filter(Boolean)
                  .join(" ")
              : undefined,
          items: lines.map((l) => {
            const modifiers = [
              ...(l.selectedOptions ? formatSelectedVariationLabels(l.selectedOptions) : []),
              ...(l.removedIngredients?.map((r) => `${r} çıkar`) ?? []),
            ];
            return {
              qty: l.qty,
              name: l.name,
              unitPrice: l.unitPrice,
              lineTotal: Math.round(l.unitPrice * l.qty * 100) / 100,
              modifiers: modifiers.length > 0 ? modifiers : undefined,
            };
          }),
          subtotal: cartTotal,
          total: cartTotal,
          paymentMethodLabel: needsDeclaredPayment && payMethod
            ? paymentMethodLabel(payMethod, mealBrand || undefined)
            : "Kasada",
          orderNote: orderNote.trim() || undefined,
          courierNote: channel === "delivery" ? customer.courierNote.trim() || undefined : undefined,
        };

        const baseOptions = await fetchKasaReceiptPrintOptions();
        if (baseOptions) {
          printThermalReceipt(receipt, {
            ...baseOptions,
            settings: receiptSettingsForKasaChannel(baseOptions.settings, channel),
          });
        }
      }

      setCart({});
      setOrderNote("");
      onOrderPlaced?.();
      onClose();
    } catch {
      window.alert("Sipariş kaydedilemedi. Bağlantıyı kontrol edin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const customizeIngredients = customize ? parseIngredientLines(customize.ingredients) : [];
  const customizeBase = customize
    ? getProductPriceForFulfillmentWithVariations(customize, channel, [])
    : 0;
  const customizeLive = customizeBase + sumVariationDeltas(selectedOptions);

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-background" role="dialog" aria-modal="true">
      <header className="flex shrink-0 items-center gap-3 border-b border-surface-container-highest bg-surface-container-lowest px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (channel === "delivery" && step === "customer") {
              setStep("menu");
              return;
            }
            onClose();
          }}
          className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-surface-container-highest bg-white text-on-background active:scale-95"
          aria-label={channel === "delivery" && step === "customer" ? "Ürünlere dön" : "Kapat"}
        >
          <span className="material-symbols-outlined text-[28px]">
            {channel === "delivery" && step === "customer" ? "arrow_back" : "close"}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {fulfillmentTypeLabel(channel)}
            {channel === "delivery" ? (step === "customer" ? " · Müşteri" : " · Ürünler") : ""}
          </p>
          <h2 className="truncate font-headline text-xl font-extrabold text-on-background">{headerTitle}</h2>
        </div>
        {channel === "delivery" && step === "menu" ? (
          <button
            type="button"
            onClick={() => setStep("customer")}
            className="inline-flex h-12 items-center gap-1 rounded-2xl border border-surface-container-highest bg-white px-3 text-xs font-bold text-on-background active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Müşteri
          </button>
        ) : null}
        <p className="shrink-0 font-headline text-lg font-black text-on-background">{formatTry(cartTotal)}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-surface-container-highest lg:border-b-0 lg:border-r">
          {channel === "delivery" && step === "customer" ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-lowest px-4 py-4 sm:px-5">
              <div className="mb-4">
                <h3 className="font-headline text-lg font-extrabold text-on-background">Müşteri bilgileri</h3>
                <p className="mt-1 text-sm text-secondary">
                  Telefonun ilk rakamlarını yazın; kayıtlı müşteriler anında listelenir.
                </p>
              </div>
              <CustomerIdentityAddressForm
                idPrefix="kasa-paket"
                values={customer}
                onChange={(next) => {
                  setCustomer(next);
                  setPhoneSuggestOpen(true);
                }}
                phoneFirst
                showPrefillNotice={false}
                showOrderNote={false}
                showCourierNote
                hideAddress={false}
                phoneFieldSlot={
                  <div className="mt-2">
                    {phoneSearching ? (
                      <p className="text-[11px] font-medium text-primary">Müşteriler aranıyor…</p>
                    ) : null}
                    {phoneSuggestOpen && phoneSuggestions.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm">
                        <p className="border-b border-surface-container-high px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-secondary">
                          Eşleşen müşteriler
                        </p>
                        <ul className="max-h-52 overflow-y-auto">
                          {phoneSuggestions.map((m) => {
                            const addr = addressPreview(m);
                            return (
                              <li key={`${m.phone}-${m.lastOrderAt}`}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-primary/5 active:bg-primary/10"
                                  onClick={() => applyCustomerMatch(m)}
                                >
                                  <span className="font-mono text-sm font-bold tracking-wide text-on-background">
                                    {formatCashierPhonePreview(m.phone)}
                                  </span>
                                  <span className="text-xs text-secondary">
                                    {[m.firstName, m.lastName].filter(Boolean).join(" ") || "İsimsiz"}
                                    {m.orderCount > 1 ? ` · ${m.orderCount} sipariş` : ""}
                                  </span>
                                  {addr ? (
                                    <span className="line-clamp-1 text-[11px] text-secondary/80">{addr}</span>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : customer.phone.replace(/\D/g, "").length >= 3 && !phoneSearching ? (
                      <p className="text-[11px] text-secondary">Eşleşen kayıtlı numara yok — yeni müşteri girin.</p>
                    ) : null}
                  </div>
                }
              />
              <div className="mt-6 border-t border-surface-container-highest pt-5">
                <CheckoutPaymentSelector
                  options={resolvedPaymentFlags}
                  method={payMethod}
                  mealCardBrandId={mealBrand}
                  onMethodChange={(m) => {
                    setPayMethod(m);
                    if (m !== "meal_card") setMealBrand("");
                  }}
                  onMealCardBrandChange={setMealBrand}
                  labelVariant="counter"
                />
                <p className="mt-2 text-[11px] text-secondary">
                  Kurye fişinde bu ödeme yöntemi görünür.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 overflow-x-auto border-b border-surface-container-highest bg-surface-container-lowest px-3 py-2">
                <div className="flex w-max gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryId("all")}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-95",
                      categoryId === "all"
                        ? "bg-primary text-white"
                        : "border border-surface-container-highest bg-white text-on-background",
                    ].join(" ")}
                  >
                    Tümü
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={[
                        "rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-95",
                        categoryId === c.id
                          ? "bg-primary text-white"
                          : "border border-surface-container-highest bg-white text-on-background",
                      ].join(" ")}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {visibleProducts.length === 0 ? (
                  <p className="py-16 text-center text-sm text-secondary">Bu kategoride ürün yok.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {visibleProducts.map((p) => {
                      const price = getProductPriceForFulfillmentWithVariations(p, channel, []);
                      const detail =
                        hasVariations(p.variationGroups) || parseIngredientLines(p.ingredients).length > 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => openProduct(p)}
                          className="flex min-h-[148px] flex-col overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest text-left shadow-sm transition active:scale-[0.98] active:border-primary/40"
                        >
                          <div className="relative h-24 w-full bg-surface-container-low sm:h-28">
                            {p.imageDataUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageDataUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-secondary/35">
                                <span className="material-symbols-outlined text-4xl">restaurant</span>
                              </div>
                            )}
                            {detail ? (
                              <span className="absolute bottom-2 right-2 rounded-lg bg-on-background/75 px-2 py-0.5 text-[10px] font-bold text-white">
                                Detay
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-1 flex-col p-3">
                            <p className="line-clamp-2 text-sm font-bold leading-snug text-on-background">
                              {p.name}
                            </p>
                            <p className="mt-auto pt-2 font-headline text-base font-black text-primary">
                              {formatTry(price)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="flex max-h-[42vh] w-full shrink-0 flex-col bg-surface-container-lowest lg:max-h-none lg:w-[22rem] xl:w-96">
          <div className="border-b border-surface-container-highest px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sepet</p>
            <p className="font-headline text-lg font-black text-on-background">
              {cartCount} ürün · {formatTry(cartTotal)}
            </p>
            {channel === "delivery" && step === "customer" && customer.phone.trim() ? (
              <p className="mt-1 truncate text-xs text-secondary">
                {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Müşteri"}
                {" · "}
                {formatCashierPhonePreview(customer.phone)}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {cartLines.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-secondary">
                Soldan ürünlere dokunarak sepete ekleyin.
              </p>
            ) : (
              cartLines.map((line) => {
                const unit = getProductPriceForFulfillmentWithVariations(
                  line.product,
                  channel,
                  line.selectedOptions,
                );
                const mods = [
                  ...formatSelectedVariationLabels(line.selectedOptions),
                  ...line.removedIngredients.map((r) => `${r} çıkar`),
                ];
                return (
                  <div
                    key={line.key}
                    className="rounded-2xl border border-surface-container-highest bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-on-background">{line.product.name}</p>
                      <p className="shrink-0 text-sm font-black text-on-background">
                        {formatTry(unit * line.qty)}
                      </p>
                    </div>
                    {mods.length > 0 ? (
                      <p className="mt-1 text-[11px] leading-snug text-secondary">{mods.join(" · ")}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustQty(line.key, -1)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-low active:scale-95"
                        aria-label="Azalt"
                      >
                        <span className="material-symbols-outlined text-[22px]">remove</span>
                      </button>
                      <span className="min-w-[2rem] text-center text-base font-black">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => adjustQty(line.key, 1)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-low active:scale-95"
                        aria-label="Arttır"
                      >
                        <span className="material-symbols-outlined text-[22px]">add</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-surface-container-highest p-4">
            {channel === "delivery" && step === "customer" && payMethod ? (
              <p className="text-xs text-secondary">
                Ödeme:{" "}
                <span className="font-semibold text-on-background">
                  {paymentMethodLabel(payMethod, mealBrand || undefined)}
                </span>
              </p>
            ) : null}
            {channel === "pickup" ? (
              <p className="text-xs text-secondary">
                Sipariş açık kalır; müşteri gelince kasada ödeme alınır.
              </p>
            ) : null}
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                Sipariş notu
              </span>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                rows={2}
                placeholder="Mutfağa not…"
                className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              disabled={submitting || cartLines.length === 0}
              onClick={() => void handleComplete()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[22px]">
                {channel === "delivery" && step === "menu" ? "arrow_forward" : "print"}
              </span>
              {submitting
                ? "Kaydediliyor…"
                : channel === "delivery" && step === "menu"
                  ? "Müşteri bilgisine geç"
                  : "Siparişi tamamla"}
            </button>
          </div>
        </aside>
      </div>

      {customize ? (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-on-background/45 p-0 sm:items-center sm:p-6">
          <button type="button" className="absolute inset-0" aria-label="Kapat" onClick={() => setCustomize(null)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl sm:rounded-3xl">
            <div className="border-b border-surface-container-high px-5 py-4">
              <h3 className="font-headline text-xl font-bold text-on-background">{customize.name}</h3>
              <p className="mt-1 text-sm text-secondary">Seçenek ve malzeme detayı</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {customize.variationGroups.map((group) => (
                <div key={group.id} className="mb-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-on-background">{group.name}</h4>
                    <span className="text-[10px] font-bold uppercase text-secondary">
                      {group.type === "single" ? (group.required ? "Zorunlu" : "Tek") : "Çoklu"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.options.map((option) => {
                      const checked = selectedOptions.some(
                        (o) => o.groupId === group.id && o.optionId === option.id,
                      );
                      const delta = formatDelta(option.priceDelta);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            group.type === "single"
                              ? selectSingle(group, option)
                              : toggleMulti(group, option)
                          }
                          className={[
                            "flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left active:scale-[0.99]",
                            checked ? "border-primary bg-primary/10" : "border-surface-container-high bg-white",
                          ].join(" ")}
                        >
                          <span className="text-sm font-semibold text-on-background">{option.label}</span>
                          {delta ? <span className="text-xs font-bold text-primary">{delta}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {customizeIngredients.length > 0 ? (
                <div
                  className={
                    customize.variationGroups.length > 0 ? "border-t border-surface-container-high pt-4" : ""
                  }
                >
                  <h4 className="mb-2 text-sm font-bold text-on-background">Malzeme çıkar</h4>
                  <div className="grid gap-2">
                    {customizeIngredients.map((ing) => {
                      const on = removedIngredients.includes(ing);
                      return (
                        <button
                          key={ing}
                          type="button"
                          onClick={() =>
                            setRemovedIngredients((prev) =>
                              on ? prev.filter((x) => x !== ing) : [...prev, ing],
                            )
                          }
                          className={[
                            "flex min-h-12 items-center rounded-2xl border px-4 py-3 text-left text-sm font-semibold active:scale-[0.99]",
                            on
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-950"
                              : "border-surface-container-high bg-white text-on-background",
                          ].join(" ")}
                        >
                          {on ? "− " : ""}
                          {ing}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="mt-5 block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                  Ürün notu (opsiyonel)
                </span>
                <input
                  value={lineNoteDraft}
                  onChange={(e) => setLineNoteDraft(e.target.value)}
                  placeholder="Örn. az pişmiş"
                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="border-t border-surface-container-high p-4">
              <button
                type="button"
                onClick={() => addToCart(customize, removedIngredients, selectedOptions, lineNoteDraft)}
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white active:scale-[0.98]"
              >
                Sepete ekle · {formatTry(customizeLive)}
              </button>
              <button
                type="button"
                onClick={() => setCustomize(null)}
                className="mt-2 w-full rounded-xl border border-surface-container-highest py-3 text-sm font-semibold text-secondary"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
