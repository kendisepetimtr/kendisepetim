import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  normalizeTimeString,
  type BusinessHoursDayMode,
} from "@/lib/business-hours";
import { DEFAULT_DELIVERY_RADIUS_KM } from "@/lib/fulfillment";
import { writePublicCheckoutMirror } from "@/lib/public-checkout-mirror";
import { parseMealCardBrandIds, type MealCardBrandId } from "@/lib/tenant-payment";
import { normalizeTenantPlan } from "@/lib/tenant-entitlements";

export const LOCAL_TENANT_STORAGE_KEY = "kendisepetim_tenant_v1";

/** İşletme logosu (data URL); localStorage güvenliği için üst sınır */
export const MAX_TENANT_LOGO_DATA_URL_LENGTH = 1_200_000;

export type LocalTenantProfile = {
  businessName: string;
  subdomain: string;
  ownerName: string;
  email: string;
  phone: string;
  registeredAt: string;
  /** İşletme logosu; boş = yok */
  logoDataUrl: string;
  /** QR menü kapak görseli; boş = yok */
  coverImageUrl: string;
  /** QR menüde görünen açıklama */
  publicDescription: string;
  /** Haritada aç bağlantısı */
  googleMapsUrl: string;
  /** Google yorum / işletme sayfası */
  googleReviewsUrl: string;
  /** Arama motorlarında görünürlük */
  seoIndexEnabled: boolean;
  /** QR / herkese açık menü */
  publicMenuEnabled: boolean;
  /**
   * Sipariş / rapor günü: takvim günü mü, yoksa mesai aralığı (gece sarkan vardiya) mı.
   * QR “açık” hesabı bu alandan bağımsızdır; yalnızca openTime/closeTime kullanılır.
   */
  hoursDayMode: BusinessHoursDayMode;
  /** 24 saat HH:mm */
  openTime: string;
  /** 24 saat HH:mm; açılıştan küçükse ertesi güne sarkan kapanış */
  closeTime: string;
  /** QR sipariş — kapıda nakit (çevrimiçi ödeme yok) */
  paymentCash: boolean;
  /** Kapıda kredi kartı */
  paymentDoorCard: boolean;
  /** Yemek kartı (markalar paymentMealCardBrands) */
  paymentMealCard: boolean;
  /** Ayarlardan seçilen yemek kartı markaları */
  paymentMealCardBrands: MealCardBrandId[];
  /** Marketplace vitrininde listelenir (opt-in) */
  marketplaceEnabled: boolean;
  /** free | premium | lifetime — superadmin / ödeme */
  plan: "free" | "premium" | "lifetime";
  /** Ücretsiz deneme bitiş ISO; null = yok */
  trialEndsAt: string | null;
  city: string;
  district: string;
  neighborhood: string;
  cuisineTags: string[];
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number;
  fulfillmentPickupEnabled: boolean;
  fulfillmentDeliveryEnabled: boolean;
  minOrderAmount: number | null;
  tableCount: number;
  dineInEnabled: boolean;
  orderEtaAutoEnabled: boolean;
  orderEtaMode: "total" | "stages";
  orderEtaTotalMinutes: number;
  orderEtaPrepMinutes: number;
  orderEtaReadyMinutes: number;
  orderEtaDispatchMinutes: number;
  orderEtaDeliverMinutes: number;
};

export function saveLocalTenant(
  data: Partial<Omit<LocalTenantProfile, "registeredAt">> &
    Pick<LocalTenantProfile, "businessName" | "subdomain" | "ownerName" | "email" | "phone"> & {
      registeredAt?: string;
    },
): void {
  if (typeof window === "undefined") return;
  const profile: LocalTenantProfile = {
    businessName: data.businessName,
    subdomain: data.subdomain,
    ownerName: data.ownerName,
    email: data.email,
    phone: data.phone,
    logoDataUrl: data.logoDataUrl ?? "",
    coverImageUrl: data.coverImageUrl ?? "",
    publicDescription: data.publicDescription ?? "",
    googleMapsUrl: data.googleMapsUrl ?? "",
    googleReviewsUrl: data.googleReviewsUrl ?? "",
    seoIndexEnabled: data.seoIndexEnabled === true,
    publicMenuEnabled: data.publicMenuEnabled !== false,
    hoursDayMode: data.hoursDayMode === "shift" ? "shift" : "calendar",
    openTime: normalizeTimeString(data.openTime ?? DEFAULT_OPEN_TIME, DEFAULT_OPEN_TIME),
    closeTime: normalizeTimeString(data.closeTime ?? DEFAULT_CLOSE_TIME, DEFAULT_CLOSE_TIME),
    paymentCash: data.paymentCash !== false,
    paymentDoorCard: data.paymentDoorCard === true,
    paymentMealCard: data.paymentMealCard === true,
    paymentMealCardBrands: parseMealCardBrandIds(data.paymentMealCardBrands),
    marketplaceEnabled: data.marketplaceEnabled === true,
    plan: normalizeTenantPlan(data.plan),
    trialEndsAt:
      typeof data.trialEndsAt === "string" && data.trialEndsAt.trim()
        ? data.trialEndsAt
        : null,
    city: data.city ?? "",
    district: data.district ?? "",
    neighborhood: data.neighborhood ?? "",
    cuisineTags: Array.isArray(data.cuisineTags) ? data.cuisineTags : [],
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    deliveryRadiusKm:
      typeof data.deliveryRadiusKm === "number" && Number.isFinite(data.deliveryRadiusKm)
        ? data.deliveryRadiusKm
        : DEFAULT_DELIVERY_RADIUS_KM,
    fulfillmentPickupEnabled: data.fulfillmentPickupEnabled !== false,
    fulfillmentDeliveryEnabled: data.fulfillmentDeliveryEnabled === true,
    minOrderAmount:
      typeof data.minOrderAmount === "number" && Number.isFinite(data.minOrderAmount)
        ? data.minOrderAmount
        : null,
    tableCount:
      typeof data.tableCount === "number" && Number.isFinite(data.tableCount) ? Math.max(0, data.tableCount) : 0,
    dineInEnabled: data.dineInEnabled === true,
    orderEtaAutoEnabled: data.orderEtaAutoEnabled === true,
    orderEtaMode: data.orderEtaMode === "stages" ? "stages" : "total",
    orderEtaTotalMinutes:
      typeof data.orderEtaTotalMinutes === "number" ? data.orderEtaTotalMinutes : 15,
    orderEtaPrepMinutes: typeof data.orderEtaPrepMinutes === "number" ? data.orderEtaPrepMinutes : 10,
    orderEtaReadyMinutes: typeof data.orderEtaReadyMinutes === "number" ? data.orderEtaReadyMinutes : 12,
    orderEtaDispatchMinutes:
      typeof data.orderEtaDispatchMinutes === "number" ? data.orderEtaDispatchMinutes : 15,
    orderEtaDeliverMinutes:
      typeof data.orderEtaDeliverMinutes === "number" ? data.orderEtaDeliverMinutes : 30,
    registeredAt: data.registeredAt ?? new Date().toISOString(),
  };
  window.localStorage.setItem(LOCAL_TENANT_STORAGE_KEY, JSON.stringify(profile));
  writePublicCheckoutMirror(profile);
}

export function getLocalTenant(): LocalTenantProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_TENANT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<LocalTenantProfile>;
    if (
      typeof p.businessName !== "string" ||
      typeof p.subdomain !== "string" ||
      typeof p.ownerName !== "string" ||
      typeof p.email !== "string" ||
      typeof p.phone !== "string"
    ) {
      return null;
    }
    let logoDataUrl = typeof p.logoDataUrl === "string" ? p.logoDataUrl : "";
    if (logoDataUrl.length > MAX_TENANT_LOGO_DATA_URL_LENGTH) logoDataUrl = "";
    const coverImageUrl = typeof p.coverImageUrl === "string" ? p.coverImageUrl : "";
    const publicDescription = typeof p.publicDescription === "string" ? p.publicDescription : "";
    const googleMapsUrl = typeof p.googleMapsUrl === "string" ? p.googleMapsUrl : "";
    const googleReviewsUrl = typeof p.googleReviewsUrl === "string" ? p.googleReviewsUrl : "";
    const seoIndexEnabled = p.seoIndexEnabled === true;
    const publicMenuEnabled = p.publicMenuEnabled !== false;

    const hoursDayMode: BusinessHoursDayMode = p.hoursDayMode === "shift" ? "shift" : "calendar";
    const openTime = normalizeTimeString(
      typeof p.openTime === "string" ? p.openTime : DEFAULT_OPEN_TIME,
      DEFAULT_OPEN_TIME,
    );
    const closeTime = normalizeTimeString(
      typeof p.closeTime === "string" ? p.closeTime : DEFAULT_CLOSE_TIME,
      DEFAULT_CLOSE_TIME,
    );

    const paymentCash = p.paymentCash !== false;
    const paymentDoorCard = p.paymentDoorCard === true;
    const paymentMealCard = p.paymentMealCard === true;
    const paymentMealCardBrands = parseMealCardBrandIds(p.paymentMealCardBrands);

    const marketplaceEnabled = p.marketplaceEnabled === true;
    const plan = normalizeTenantPlan(p.plan);
    const trialEndsAt =
      typeof p.trialEndsAt === "string" && p.trialEndsAt.trim() ? p.trialEndsAt : null;
    const city = typeof p.city === "string" ? p.city : "";
    const district = typeof p.district === "string" ? p.district : "";
    const neighborhood = typeof p.neighborhood === "string" ? p.neighborhood : "";
    const cuisineTags = Array.isArray(p.cuisineTags)
      ? p.cuisineTags.filter((t): t is string => typeof t === "string")
      : [];
    const latitude = typeof p.latitude === "number" && Number.isFinite(p.latitude) ? p.latitude : null;
    const longitude = typeof p.longitude === "number" && Number.isFinite(p.longitude) ? p.longitude : null;
    const deliveryRadiusKm =
      typeof p.deliveryRadiusKm === "number" && Number.isFinite(p.deliveryRadiusKm) ? p.deliveryRadiusKm : 5;
    const fulfillmentPickupEnabled = p.fulfillmentPickupEnabled !== false;
    const fulfillmentDeliveryEnabled = p.fulfillmentDeliveryEnabled === true;
    const minOrderAmount =
      typeof p.minOrderAmount === "number" && Number.isFinite(p.minOrderAmount) ? p.minOrderAmount : null;
    const tableCount = typeof p.tableCount === "number" && Number.isFinite(p.tableCount) ? Math.max(0, p.tableCount) : 0;
    const dineInEnabled = p.dineInEnabled === true;

    return {
      businessName: p.businessName,
      subdomain: p.subdomain,
      ownerName: p.ownerName,
      email: p.email,
      phone: p.phone,
      registeredAt: typeof p.registeredAt === "string" ? p.registeredAt : new Date().toISOString(),
      logoDataUrl,
      coverImageUrl,
      publicDescription,
      googleMapsUrl,
      googleReviewsUrl,
      seoIndexEnabled,
      publicMenuEnabled,
      hoursDayMode,
      openTime,
      closeTime,
      paymentCash,
      paymentDoorCard,
      paymentMealCard,
      paymentMealCardBrands,
      marketplaceEnabled,
      plan,
      trialEndsAt,
      city,
      district,
      neighborhood,
      cuisineTags,
      latitude,
      longitude,
      deliveryRadiusKm,
      fulfillmentPickupEnabled,
      fulfillmentDeliveryEnabled,
      minOrderAmount,
      tableCount,
      dineInEnabled,
      orderEtaAutoEnabled: p.orderEtaAutoEnabled === true,
      orderEtaMode: p.orderEtaMode === "stages" ? "stages" : "total",
      orderEtaTotalMinutes:
        typeof p.orderEtaTotalMinutes === "number" && Number.isFinite(p.orderEtaTotalMinutes)
          ? p.orderEtaTotalMinutes
          : 15,
      orderEtaPrepMinutes:
        typeof p.orderEtaPrepMinutes === "number" && Number.isFinite(p.orderEtaPrepMinutes)
          ? p.orderEtaPrepMinutes
          : 10,
      orderEtaReadyMinutes:
        typeof p.orderEtaReadyMinutes === "number" && Number.isFinite(p.orderEtaReadyMinutes)
          ? p.orderEtaReadyMinutes
          : 12,
      orderEtaDispatchMinutes:
        typeof p.orderEtaDispatchMinutes === "number" && Number.isFinite(p.orderEtaDispatchMinutes)
          ? p.orderEtaDispatchMinutes
          : 15,
      orderEtaDeliverMinutes:
        typeof p.orderEtaDeliverMinutes === "number" && Number.isFinite(p.orderEtaDeliverMinutes)
          ? p.orderEtaDeliverMinutes
          : 30,
    };
  } catch {
    return null;
  }
}

export function clearLocalTenant(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_TENANT_STORAGE_KEY);
}
