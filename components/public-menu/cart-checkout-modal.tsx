"use client";

import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import CustomerIdentityAddressForm from "@/components/customer/customer-identity-address-form";
import CustomerAddressMap from "@/components/customer/customer-address-map";
import CustomerLocationField from "@/components/customer/customer-location-field";
import type { ResolvedAddress } from "@/lib/geocoding/client";
import {
  addressHasCoordinates,
  applyAddressToFormValues,
  emptyCustomerFormValues,
  formatAddressOneLine,
  type CustomerFormValues,
  validateCustomerFormForFulfillment,
} from "@/lib/customer-address";
import { asGeoPoint, isWithinDeliveryRadius, type GeoPoint } from "@/lib/geo";
import { stripCourierLocationNoteLine } from "@/lib/maps-links";
import { appendLocalOrder, type LocalOrder, type LocalOrderLine } from "@/lib/local-orders";
import { getGuestCustomer, guestDefaultAddress, saveGuestFromCheckout } from "@/lib/guest-customer";
import type { CustomerSavedAddress } from "@/lib/musteri/customer-profile";
import type { MusteriCheckoutContextResponse } from "@/app/api/musteri/checkout-context/route";
import { customerOrderPath, MUSTERI_ADDRESSES_PATH, MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";
import { getLastSavedAddressId, setLastSavedAddressId } from "@/lib/musteri/last-address";
import { getOAuthSiteBase } from "@/lib/site-url";
import type { LocalMenuProduct } from "@/lib/local-menu";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import {
  buildCartKey,
  buildCartLines,
  type CartLine,
  type CartState,
} from "@/lib/public-cart";
import {
  getProductPriceForFulfillment,
  getProductPriceForFulfillmentWithVariations,
} from "@/lib/product-pricing";
import {
  fulfillmentTypeLabel,
  resolveDefaultFulfillmentType,
  type FulfillmentType,
  type TenantFulfillmentFlags,
} from "@/lib/fulfillment";
import { upsertLocalCustomerByPhone } from "@/lib/local-customers";
import { formatCashierPhonePreview, type CashierCustomerMatch } from "@/lib/kasa/customer-search";
import { loadQrCheckoutSession, saveQrCheckoutSession } from "@/lib/qr-checkout-session";
import { useMenuT } from "@/lib/use-menu-locale";
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

type Step = "cart" | "checkout";

type CartCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  cart: CartState;
  setCart: React.Dispatch<React.SetStateAction<CartState>>;
  visibleProducts: LocalMenuProduct[];
  paymentFlags: TenantPaymentFlags;
  fulfillmentFlags: TenantFulfillmentFlags;
  orderSource?: "qr_menu" | "marketplace" | "table_qr";
  tableNumber?: number;
  /** Garson panelinden siparis — musteri formu yok */
  waiterMode?: boolean;
  /** Kasa POS — /api/kasa/orders, ödeme kapanışta */
  cashierMode?: boolean;
  /** Kasa sipariş kanalı (cashierMode iken) */
  cashierFulfillment?: FulfillmentType;
  onCashierOrderPlaced?: (result: { orderId: string; orderCode: string }) => void;
  /** Menü subdomain (işletme kimliği) */
  subdomain: string;
  /** Haritada restoran işareti */
  restaurantLogoUrl?: string;
  orderingEnabled: boolean;
  closedMessage: string;
  /** Nav’dan açılınca sepet özetini atlayıp onay adımına geç */
  initialStep?: Step;
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
  tableNumber,
  waiterMode = false,
  cashierMode = false,
  cashierFulfillment,
  onCashierOrderPlaced,
  subdomain,
  restaurantLogoUrl = "",
  orderingEnabled,
  closedMessage,
  initialStep = "cart",
}: CartCheckoutModalProps) {
  const { t } = useMenuT();
  const baseId = useId();
  const isTableOrder = tableNumber != null && tableNumber > 0;
  const isWaiterOrder = waiterMode && isTableOrder && !cashierMode;
  const isCashierOrder = cashierMode;
  const defaultFulfillment = isTableOrder
    ? "dine_in"
    : cashierFulfillment ?? resolveDefaultFulfillmentType(fulfillmentFlags);
  const [step, setStep] = useState<Step>("cart");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(
    cashierMode && cashierFulfillment
      ? cashierFulfillment
      : isTableOrder
        ? "dine_in"
        : defaultFulfillment ?? "pickup",
  );
  const [phoneSuggestions, setPhoneSuggestions] = useState<CashierCustomerMatch[]>([]);
  const [phoneSuggestOpen, setPhoneSuggestOpen] = useState(false);
  const [customerLatitude, setCustomerLatitude] = useState<number | null>(null);
  const [customerLongitude, setCustomerLongitude] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<CustomerFormValues>(() => emptyCustomerFormValues());
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">("");
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">("");
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerSavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [lastUsedAddressId, setLastUsedAddressId] = useState<string>("");
  const [guestSuccess, setGuestSuccess] = useState<{ orderCode: string; table: boolean } | null>(null);

  const customerPoint = useMemo(
    () => asGeoPoint(customerLatitude, customerLongitude),
    [customerLatitude, customerLongitude],
  );
  /** İşletme konumu tanımlıysa haritada dükkânı ve teslimat dairesini de gösteririz. */
  const restaurantPoint = useMemo(
    () => asGeoPoint(fulfillmentFlags.latitude, fulfillmentFlags.longitude),
    [fulfillmentFlags.latitude, fulfillmentFlags.longitude],
  );
  /** Konum yalnızca paket siparişte gerekir; masa ve gel-al'da istenmez. */
  const isDeliveryOrder = fulfillmentType === "delivery";
  /** Müşteri: harita tek kaynak — mahalle pinden gelir, çelişen ikinci adres oluşamaz. */
  const showAddressMap = !isCashierOrder && !isTableOrder && isDeliveryOrder;
  /** Kasa: adres serbest metin kalır, konum yalnızca opsiyonel ek. */
  const showCashierLocationField = isCashierOrder && isDeliveryOrder;

  const applySavedAddress = useCallback((addr: CustomerSavedAddress) => {
    setSelectedAddressId(addr.id);
    const point = addressHasCoordinates(addr.address)
      ? { lat: addr.address.latitude as number, lng: addr.address.longitude as number }
      : null;

    setCustomerLatitude(point?.lat ?? null);
    setCustomerLongitude(point?.lng ?? null);
    setFormValues((prev) => {
      const withAddr = applyAddressToFormValues(prev, addr.address);
      return { ...withAddr, courierNote: stripCourierLocationNoteLine(withAddr.courierNote) };
    });
    setLocMsg(
      point
        ? "Kayıtlı adresteki konum kullanılacak."
        : "Bu kayıtlı adreste konum yok — yukarıdaki haritadan işaretleyin.",
    );
  }, []);

  const hydrateCheckout = useCallback(async () => {
    const session = loadQrCheckoutSession(subdomain);
    const guest = getGuestCustomer();
    const guestAddr = guestDefaultAddress(guest);
    const base = emptyCustomerFormValues();
    const guestPrefill: CustomerFormValues = {
      ...base,
      firstName: session.firstName || guest.firstName || "",
      lastName: session.lastName || guest.lastName || "",
      phone: session.phone || guest.phone || "",
      email: session.email || guest.email || "",
      neighborhood: session.neighborhood || guestAddr?.address.neighborhood || "",
      street: session.street || guestAddr?.address.street || "",
      buildingNo: session.buildingNo || guestAddr?.address.buildingNo || "",
      buildingName: session.buildingName || guestAddr?.address.buildingName || "",
      floor: session.floor || guestAddr?.address.floor || "",
      apartmentNo: session.apartmentNo || guestAddr?.address.apartmentNo || "",
      livesInSite: session.livesInSite === true || guestAddr?.address.livesInSite === true,
      siteName: session.siteName || guestAddr?.address.siteName || "",
      block: session.block || guestAddr?.address.block || "",
      orderNote: "",
      courierNote: guestAddr?.address.courierNote ?? "",
    };

    setLoggedInCustomer(false);
    setSavedAddresses([]);
    setSelectedAddressId("");
    setCustomerLatitude(null);
    setCustomerLongitude(null);
    setFormValues(guestPrefill);

    const picked = pickDefaultPaymentMethod(paymentFlags, session.lastPaymentMethod ?? "");
    setPayMethod(picked);
    setMealBrand(
      picked === "meal_card" && session.lastMealCardBrandId ? session.lastMealCardBrandId : "",
    );
    setLocMsg(null);

    if (waiterMode || cashierMode) return;

    try {
      const res = await fetch("/api/musteri/checkout-context", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as MusteriCheckoutContextResponse;
      if (!res.ok || !data.ok || data.kind !== "customer") return;

      setLoggedInCustomer(true);
      setSavedAddresses(data.addresses);
      setLastUsedAddressId(getLastSavedAddressId());
      setFormValues((prev) => ({
        ...prev,
        firstName: data.firstName || prev.firstName,
        lastName: data.lastName || prev.lastName,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
      }));

      const lastId = getLastSavedAddressId();
      const preferred =
        (lastId ? data.addresses.find((a) => a.id === lastId) : null) ??
        data.addresses.find((a) => a.isDefault) ??
        data.addresses[0] ??
        null;
      if (preferred) {
        applySavedAddress(preferred);
      }
    } catch {
      /* misafir gibi devam */
    }
  }, [paymentFlags, subdomain, waiterMode, cashierMode, applySavedAddress]);

  useEffect(() => {
    if (!open) return;
    const hasItems = Object.values(cart).some((entry) => entry.qty > 0);
    setStep(initialStep === "checkout" && hasItems ? "checkout" : "cart");
    if (cashierMode && cashierFulfillment) {
      setFulfillmentType(cashierFulfillment);
    } else if (isTableOrder) {
      setFulfillmentType("dine_in");
    }
  }, [open, cashierMode, cashierFulfillment, isTableOrder, initialStep]);

  useEffect(() => {
    if (!isCashierOrder || fulfillmentType !== "delivery") return;
    const phone = formValues.phone.trim();
    if (phone.length < 3) {
      setPhoneSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/kasa/customers/search?q=${encodeURIComponent(phone)}`, {
            cache: "no-store",
          });
          const data = (await res.json()) as { ok?: boolean; matches?: CashierCustomerMatch[] };
          if (res.ok && data.ok && data.matches) {
            setPhoneSuggestions(data.matches);
            setPhoneSuggestOpen(data.matches.length > 0);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [formValues.phone, isCashierOrder, fulfillmentType]);

  useEffect(() => {
    if (!open || step !== "checkout") return;
    if (isCashierOrder && fulfillmentType === "dine_in") return;
    void hydrateCheckout();
  }, [open, step, hydrateCheckout, isCashierOrder, fulfillmentType]);

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

  const cartLines: CartLine[] = useMemo(
    () => buildCartLines(cart, visibleProducts),
    [cart, visibleProducts],
  );

  const cartTotal = cartLines.reduce(
    (s, l) => s + getProductPriceForFulfillmentWithVariations(l.product, fulfillmentType, l.selectedOptions) * l.qty,
    0,
  );

  const minOrderAmount =
    fulfillmentFlags.minOrderAmount != null &&
    Number.isFinite(fulfillmentFlags.minOrderAmount) &&
    fulfillmentFlags.minOrderAmount > 0
      ? fulfillmentFlags.minOrderAmount
      : null;
  const belowMinOrder =
    !isCashierOrder &&
    !isTableOrder &&
    (fulfillmentType === "delivery" || fulfillmentType === "pickup") &&
    minOrderAmount != null &&
    cartTotal < minOrderAmount;

  const outsideDeliveryRadius = useMemo(() => {
    if (!isDeliveryOrder || isCashierOrder || isTableOrder) return false;
    if (!restaurantPoint || customerPoint == null) return false;
    return !isWithinDeliveryRadius(restaurantPoint, customerPoint, fulfillmentFlags.deliveryRadiusKm);
  }, [
    isDeliveryOrder,
    isCashierOrder,
    isTableOrder,
    restaurantPoint,
    customerPoint,
    fulfillmentFlags.deliveryRadiusKm,
  ]);

  const pickupPriceDiffers = useMemo(() => {
    if (fulfillmentType !== "pickup") return false;
    return cartLines.some((l) => {
      const pickup = getProductPriceForFulfillmentWithVariations(l.product, "pickup", l.selectedOptions);
      const delivery = getProductPriceForFulfillmentWithVariations(l.product, "delivery", l.selectedOptions);
      return pickup !== delivery;
    });
  }, [fulfillmentType, cartLines]);

  const showFulfillmentChoice =
    !isCashierOrder &&
    fulfillmentFlags.fulfillmentPickupEnabled &&
    fulfillmentFlags.fulfillmentDeliveryEnabled;

  const cashierNeedsCustomer =
    isCashierOrder && (cashierFulfillment ?? fulfillmentType) === "delivery";
  const staffQuickSubmit = isWaiterOrder || (isCashierOrder && !cashierNeedsCustomer);

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
    const key = buildCartKey(productId, [], []);
    setCart((c) => ({
      ...c,
      [key]: {
        productId,
        qty: (c[key]?.qty ?? 0) + 1,
        removedIngredients: [],
        selectedOptions: [],
      },
    }));
  }

  function clearCart() {
    setCart({});
    onClose();
  }

  /** Pin değişti (GPS ya da harita). Adres metni ayrıca handleAddressResolved ile gelir. */
  function handleLocationChange(point: GeoPoint | null) {
    setCustomerLatitude(point?.lat ?? null);
    setCustomerLongitude(point?.lng ?? null);
    setLocMsg(null);
  }

  /**
   * Haritadaki pinin adres karşılığı. Mahalle her zaman pinden yazılır —
   * kullanıcı elle değiştiremediği için adres ile pin çelişemez.
   * Sokak yalnızca doluysa yazılır: sağlayıcı sokağı sık sık boş döndürüyor
   * ve zorunlu alanı silmek kullanıcıyı tıkardı.
   */
  function handleAddressResolved(address: ResolvedAddress | null) {
    if (!address) return;
    setFormValues((v) => ({
      ...v,
      neighborhood: address.neighborhood || v.neighborhood,
      street: address.street || v.street,
    }));
  }

  async function handleConfirmOrder() {
    if (!orderingEnabled) {
      window.alert(closedMessage);
      return;
    }

    const lines: LocalOrderLine[] = cartLines.map(({ product: p, qty, removedIngredients, selectedOptions }) => ({
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: getProductPriceForFulfillmentWithVariations(p, fulfillmentType, selectedOptions),
      removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
      selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
    }));

    if (isWaiterOrder) {
      setSubmitting(true);
      try {
        const response = await fetch("/api/garson/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableNumber,
            lines,
            orderNote: formValues.orderNote.trim(),
          }),
        });
        const result = (await response.json()) as { ok?: boolean; orderCode?: string; error?: string };
        if (!response.ok || !result.ok || !result.orderCode) {
          window.alert(result.error ?? "Sipariş kaydedilemedi.");
          return;
        }
        setCart({});
        onClose();
        window.alert(`Sipariş masaya iletildi.\nNo: ${result.orderCode}`);
      } catch {
        window.alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (isCashierOrder) {
      const ft = cashierFulfillment ?? fulfillmentType;
      if (ft === "delivery") {
        const err = validateCustomerFormForFulfillment(formValues, "delivery");
        if (err) {
          window.alert(err);
          return;
        }
      }

      setSubmitting(true);
      try {
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
        const response = await fetch("/api/kasa/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fulfillmentType: ft,
            tableNumber: ft === "dine_in" ? tableNumber : undefined,
            lines,
            orderNote: formValues.orderNote.trim(),
            courierNote: ft === "delivery" ? stripCourierLocationNoteLine(formValues.courierNote) : "",
            firstName: formValues.firstName.trim(),
            lastName: formValues.lastName.trim(),
            phone: formValues.phone.trim(),
            email: formValues.email.trim(),
            address: addr,
            customerLatitude: ft === "delivery" ? customerLatitude : null,
            customerLongitude: ft === "delivery" ? customerLongitude : null,
          }),
        });
        const result = (await response.json()) as {
          ok?: boolean;
          orderId?: string;
          orderCode?: string;
          error?: string;
        };
        if (!response.ok || !result.ok || !result.orderId || !result.orderCode) {
          window.alert(result.error ?? "Sipariş kaydedilemedi.");
          return;
        }
        setCart({});
        onClose();
        onCashierOrderPlaced?.({ orderId: result.orderId, orderCode: result.orderCode });
      } catch {
        window.alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    /*
     * Konum önce kontrol edilir: mahalle haritadan dolduğu için pin yoksa
     * "Mahalle zorunludur" demek kullanıcıyı elle dolduramayacağı bir alana
     * yönlendirirdi. Doğru yönlendirme haritayı göstermektir.
     */
    if (fulfillmentType === "delivery" && (customerLatitude == null || customerLongitude == null)) {
      window.alert(
        "Teslimat konumu gerekli. «Konumumu al» ile paylaşın; konum alınamıyorsa haritadan adresinizi işaretleyin.",
      );
      return;
    }
    if (outsideDeliveryRadius) {
      window.alert(
        `Seçilen konum teslimat alanı dışında (yarıçap ${fulfillmentFlags.deliveryRadiusKm} km). Pin’i yaklaştırın veya gel-al seçin.`,
      );
      return;
    }
    if (belowMinOrder && minOrderAmount != null) {
      window.alert(`Minimum sipariş tutarı ${formatTry(minOrderAmount)}. Sepete ürün ekleyin.`);
      return;
    }
    if (
      loggedInCustomer &&
      fulfillmentType === "delivery" &&
      savedAddresses.length > 0 &&
      !selectedAddressId
    ) {
      window.alert("Teslimat için kayıtlı bir adres seçin.");
      return;
    }

    const err = validateCustomerFormForFulfillment(formValues, fulfillmentType);
    if (err) {
      window.alert(err);
      return;
    }
    if (!payMethod && !isTableOrder) {
      window.alert("Lütfen bir ödeme yöntemi seçin.");
      return;
    }
    if (payMethod === "meal_card" && !isTableOrder) {
      if (!mealBrand) {
        window.alert("Lütfen yemek kartı türünü seçin.");
        return;
      }
    }

    const resolvedPayMethod: CheckoutPaymentMethod = isTableOrder ? "cash" : (payMethod as CheckoutPaymentMethod);
    const resolvedOrderSource = isTableOrder ? "table_qr" : orderSource;

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

    const linesForPlace: LocalOrderLine[] = lines;

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          orderSource: isTableOrder ? "table_qr" : orderSource,
          fulfillmentType: isTableOrder ? "dine_in" : fulfillmentType,
          tableNumber: isTableOrder ? tableNumber : undefined,
          lines: linesForPlace,
          total: cartTotal,
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          phone: formValues.phone.trim(),
          email: formValues.email.trim(),
          address: addr,
          customerLatitude: fulfillmentType === "delivery" ? customerLatitude : null,
          customerLongitude: fulfillmentType === "delivery" ? customerLongitude : null,
          paymentMethod: resolvedPayMethod,
          mealCardBrandId:
            resolvedPayMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
          orderNote: formValues.orderNote.trim(),
          courierNote: fulfillmentType === "delivery" ? stripCourierLocationNoteLine(formValues.courierNote) : "",
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        orderCode?: string;
        orderId?: string;
        error?: string;
      };

      if (!response.ok || !result.ok || !result.orderCode) {
        window.alert(result.error ?? "Sipariş kaydedilemedi.");
        return;
      }

      if (loggedInCustomer && selectedAddressId) {
        setLastSavedAddressId(selectedAddressId);
      }

      const order: LocalOrder = {
        id: result.orderCode,
        subdomain: subdomain.toLowerCase(),
        createdAt: new Date().toISOString(),
        orderSource: resolvedOrderSource,
        lines: linesForPlace,
        total: cartTotal,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
        address: addr,
        paymentMethod: resolvedPayMethod,
        mealCardBrandId: resolvedPayMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
        orderNote: formValues.orderNote.trim(),
        courierNote: fulfillmentType === "delivery" ? stripCourierLocationNoteLine(formValues.courierNote) : "",
      };

      appendLocalOrder(subdomain, order);
      upsertLocalCustomerByPhone(subdomain, {
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        email: order.email,
        address: addr,
        orderSource: resolvedOrderSource,
        lastPaymentMethod: resolvedPayMethod,
        lastMealCardBrandId:
          resolvedPayMethod === "meal_card" ? (mealBrand as MealCardBrandId) : undefined,
      });
      saveQrCheckoutSession(
        subdomain,
        formValues,
        resolvedPayMethod === "meal_card"
          ? { method: resolvedPayMethod, mealCardBrandId: mealBrand as MealCardBrandId }
          : { method: resolvedPayMethod },
      );
      saveGuestFromCheckout(
        formValues,
        fulfillmentType,
        fulfillmentType === "delivery" && customerLatitude != null && customerLongitude != null
          ? { latitude: customerLatitude, longitude: customerLongitude }
          : null,
      );

      setCart({});
      if (loggedInCustomer && result.orderId && !isWaiterOrder && !isCashierOrder) {
        window.location.href = `${getOAuthSiteBase()}${customerOrderPath(result.orderId)}`;
        return;
      }
      setGuestSuccess({ orderCode: result.orderCode, table: isTableOrder });
    } catch {
      window.alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const title = step === "cart" ? t("cartTitle") : t("checkoutTitle");

  if (guestSuccess) {
    return (
      <div className="fixed inset-0 z-[190] flex items-end justify-center p-0 sm:items-center sm:p-6">
        <button type="button" className="absolute inset-0 bg-on-background/50" aria-label="Kapat" onClick={() => {
          setGuestSuccess(null);
          onClose();
        }} />
        <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-2xl sm:rounded-2xl">
          <p className="text-sm font-bold text-primary">Sipariş alındı</p>
          <p className="mt-2 font-headline text-2xl font-extrabold">{guestSuccess.orderCode}</p>
          <p className="mt-2 text-sm text-secondary">
            {guestSuccess.table
              ? "Sipariş masaya iletildi. Ödeme restoranda alınacaktır."
              : "Restoran siparişinizi hazırlamaya başlayacak."}
          </p>
          <p className="mt-3 text-xs text-secondary">
            Canlı takip için hesapla giriş yapın. Misafir siparişinde yalnızca bu özet görünür.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <a
              href={MUSTERI_LOGIN_PATH}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
            >
              Giriş yap
            </a>
            <button
              type="button"
              className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold"
              onClick={() => {
                setGuestSuccess(null);
                onClose();
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                aria-label={t("backToCart")}
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
                  {t("cartEmpty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {cartLines.map(({ key, product: p, qty, removedIngredients, selectedOptions }) => (
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
                          {formatTry(getProductPriceForFulfillmentWithVariations(p, fulfillmentType, selectedOptions))}
                        </p>
                        {selectedOptions.length > 0 ? (
                          <p className="mt-1 text-[11px] leading-relaxed text-secondary">
                            {formatSelectedVariationLabels(selectedOptions).join(" · ")}
                          </p>
                        ) : null}
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
                    <span className="font-semibold text-secondary">{t("subtotal")}</span>
                    <span className="font-headline text-lg font-black text-on-background">{formatTry(cartTotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => (staffQuickSubmit ? void handleConfirmOrder() : setStep("checkout"))}
                    disabled={!orderingEnabled || submitting}
                    className="w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting
                      ? t("savingOrder")
                      : orderingEnabled
                        ? isWaiterOrder || (isCashierOrder && !cashierNeedsCustomer)
                          ? t("saveOrder")
                          : t("continue")
                        : t("restaurantClosed")}
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="mt-2 w-full rounded-xl border border-surface-container-highest py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container-low hover:text-on-background"
                  >
                    {t("clearCart")}
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
                {isCashierOrder
                  ? "Müşteri bilgilerini girin. Ödeme sipariş kapanışında alınır."
                  : isTableOrder
                    ? "Adınızı girin; sipariş masanıza iletilecek. Ödeme kasada alınır."
                    : loggedInCustomer
                      ? "Kayıtlı hesabınızla devam ediyorsunuz. Teslimat için adresinizi seçin, ödeme yöntemini onaylayın."
                      : "Bilgilerinizi girin, ödeme yöntemini seçin ve siparişi onaylayın. Veriler bu cihazda saklanır; bir sonraki siparişinizde hızlanır."}
              </p>
              <div className="mt-4 rounded-xl border border-surface-container-high bg-surface-container-low/50 px-3 py-2 text-xs">
                <span className="font-semibold text-on-background">{t("subtotal")}:</span>{" "}
                <span className="font-headline font-black text-primary">{formatTry(cartTotal)}</span>
              </div>
              {belowMinOrder && minOrderAmount != null ? (
                <p className="mt-2 text-xs font-semibold text-error">
                  Minimum sipariş: {formatTry(minOrderAmount)} (şu an {formatTry(cartTotal)})
                </p>
              ) : null}
              {outsideDeliveryRadius ? (
                <p className="mt-2 text-xs font-semibold text-error">
                  Konum teslimat yarıçapı dışında ({fulfillmentFlags.deliveryRadiusKm} km). Pin’i taşıyın veya gel-al
                  seçin.
                </p>
              ) : null}
              {pickupPriceDiffers ? (
                <p className="mt-2 text-[11px] text-secondary">
                  Gel-al seçildi — menüdeki paket fiyatından farklı satırlar gel-al tutarına güncellendi.
                </p>
              ) : null}

              <div className="mt-6">
                {!isCashierOrder &&
                !isTableOrder &&
                (showFulfillmentChoice || fulfillmentFlags.fulfillmentPickupEnabled || fulfillmentFlags.fulfillmentDeliveryEnabled) ? (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">{t("orderType")}</p>
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
                        Teslimat yarıçapı: {fulfillmentFlags.deliveryRadiusKm} km
                        {customerLatitude != null && customerLongitude != null
                          ? " — konum hazır."
                          : " — «Konum al» zorunludur."}
                      </p>
                    ) : null}
                  </div>
                ) : isTableOrder && !isCashierOrder ? (
                  <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                    Masa {tableNumber} · Ödeme kasada
                  </p>
                ) : isCashierOrder ? (
                  <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                    {fulfillmentTypeLabel(cashierFulfillment ?? fulfillmentType)}
                    {tableNumber ? ` · Masa ${tableNumber}` : ""} · Ödeme kapanışta
                  </p>
                ) : null}

                {loggedInCustomer &&
                !isCashierOrder &&
                !isTableOrder &&
                fulfillmentType === "delivery" ? (
                  <div className="mb-5 rounded-2xl border border-surface-container-high bg-surface-container-low/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-secondary">{t("deliveryAddress")}</p>
                      <a
                        href={`${getOAuthSiteBase()}${MUSTERI_ADDRESSES_PATH}`}
                        className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
                      >
                        Adreslerim
                      </a>
                    </div>
                    {savedAddresses.length === 0 ? (
                      <p className="mt-3 text-sm text-secondary">
                        Kayıtlı adres yok. Aşağıdan bir kez girin veya{" "}
                        <a
                          href={`${getOAuthSiteBase()}${MUSTERI_ADDRESSES_PATH}`}
                          className="font-bold text-primary underline-offset-2 hover:underline"
                        >
                          Adreslerim
                        </a>
                        ’den ekleyin.
                      </p>
                    ) : (
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {savedAddresses.map((addr) => {
                          const active = selectedAddressId === addr.id;
                          const lastUsed = lastUsedAddressId === addr.id;
                          return (
                            <li key={addr.id} className="sm:col-span-1">
                              <button
                                type="button"
                                onClick={() => applySavedAddress(addr)}
                                className={[
                                  "flex h-full w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition",
                                  active
                                    ? "border-primary bg-primary/10 shadow-sm"
                                    : "border-surface-container-highest bg-white hover:border-primary/35",
                                ].join(" ")}
                              >
                                <span
                                  className={[
                                    "mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                                    active ? "border-primary bg-primary text-white" : "border-surface-container-highest",
                                  ].join(" ")}
                                >
                                  {active ? (
                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                  ) : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-base font-extrabold text-on-background">{addr.label}</span>
                                    {addr.isDefault ? (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                        Varsayılan
                                      </span>
                                    ) : null}
                                    {lastUsed ? (
                                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary">
                                        Son kullanılan
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 block text-xs leading-relaxed text-secondary">
                                    {formatAddressOneLine(addr.address)}
                                  </span>
                                  {addressHasCoordinates(addr.address) ? (
                                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                      <span className="material-symbols-outlined text-[12px]">my_location</span>
                                      Konum hazır
                                    </span>
                                  ) : (
                                    <span className="mt-1.5 block text-[10px] text-secondary">
                                      Konum yok — aşağıdan alın
                                    </span>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {loggedInCustomer && formValues.firstName ? (
                      <p className="mt-3 text-[11px] text-secondary">
                        Sipariş:{" "}
                        <span className="font-semibold text-on-background">
                          {formValues.firstName} {formValues.lastName}
                        </span>
                        {formValues.phone ? ` · ${formValues.phone}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <CustomerIdentityAddressForm
                  idPrefix={`${baseId}-co`}
                  values={formValues}
                  onChange={(next) => {
                    setFormValues(next);
                    if (isCashierOrder && fulfillmentType === "delivery") {
                      setPhoneSuggestOpen(true);
                    }
                  }}
                  phoneFirst={isCashierOrder && fulfillmentType === "delivery"}
                  showPrefillNotice={!isCashierOrder && !loggedInCustomer}
                  hideIdentity={loggedInCustomer && !isCashierOrder && !isTableOrder}
                  showOrderNote
                  showCourierNote={
                    (!isTableOrder || isCashierOrder) && fulfillmentType === "delivery"
                  }
                  hideAddress={
                    (!isCashierOrder && isTableOrder) ||
                    fulfillmentType === "pickup" ||
                    (loggedInCustomer && !isCashierOrder && savedAddresses.length > 0 && fulfillmentType === "delivery")
                  }
                  neighborhoodReadOnly={showAddressMap}
                  addressMapSlot={
                    showAddressMap ? (
                      <CustomerAddressMap
                        point={customerPoint}
                        onPointChange={handleLocationChange}
                        onAddressResolved={handleAddressResolved}
                        restaurant={restaurantPoint}
                        restaurantLogoUrl={restaurantLogoUrl}
                        radiusKm={fulfillmentFlags.deliveryRadiusKm}
                        note={locMsg}
                      />
                    ) : null
                  }
                  locationSlot={
                    showCashierLocationField ? (
                      <CustomerLocationField
                        value={customerPoint}
                        onChange={handleLocationChange}
                        restaurant={restaurantPoint}
                        restaurantLogoUrl={restaurantLogoUrl}
                        radiusKm={fulfillmentFlags.deliveryRadiusKm}
                        note={locMsg}
                      />
                    ) : null
                  }
                  phoneFieldSlot={
                    isCashierOrder &&
                    fulfillmentType === "delivery" &&
                    phoneSuggestOpen &&
                    phoneSuggestions.length > 0 ? (
                      <div className="mt-2 overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm">
                        <p className="border-b border-surface-container-high px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-secondary">
                          Eşleşen müşteriler
                        </p>
                        <ul className="max-h-48 overflow-y-auto">
                          {phoneSuggestions.map((m) => (
                            <li key={`${m.phone}-${m.lastOrderAt}`}>
                              <button
                                type="button"
                                className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-primary/5"
                                onClick={() => {
                                  setFormValues((v) => ({
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
                                }}
                              >
                                <span className="font-mono text-sm font-bold tracking-wide text-on-background">
                                  {formatCashierPhonePreview(m.phone)}
                                </span>
                                <span className="text-xs text-secondary">
                                  {[m.firstName, m.lastName].filter(Boolean).join(" ") || "İsimsiz"}
                                  {m.orderCount > 1 ? ` · ${m.orderCount} sipariş` : ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  }
                />
              </div>

              {!isTableOrder && !isCashierOrder ? (
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
              ) : null}
            </div>

            <div className="shrink-0 border-t border-surface-container-high bg-surface-container-low/60 px-5 py-4">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={submitting || !orderingEnabled || belowMinOrder || outsideDeliveryRadius}
                className="w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
              >
                {submitting
                  ? t("savingOrder")
                  : !orderingEnabled
                    ? t("restaurantClosed")
                    : belowMinOrder
                      ? "Minimum tutarın altında"
                      : outsideDeliveryRadius
                        ? "Teslimat alanı dışında"
                        : t("confirmOrder")}
              </button>
              <button
                type="button"
                onClick={() => setStep("cart")}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border border-surface-container-highest py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container-low hover:text-on-background"
              >
                {t("backToCart")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
