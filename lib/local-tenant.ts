import {
  DEFAULT_CLOSE_TIME,
  DEFAULT_OPEN_TIME,
  normalizeTimeString,
  type BusinessHoursDayMode,
} from "@/lib/business-hours";
import { writePublicCheckoutMirror } from "@/lib/public-checkout-mirror";

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
  /** Arama motorlarında görünürlük */
  seoIndexEnabled: boolean;
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
  /** Yemek kartı (Multinet / Sodexo / Edenred) */
  paymentMealCard: boolean;
};

export function saveLocalTenant(
  data: Omit<LocalTenantProfile, "registeredAt"> & { registeredAt?: string },
): void {
  if (typeof window === "undefined") return;
  const profile: LocalTenantProfile = {
    ...data,
    paymentCash: data.paymentCash !== false,
    paymentDoorCard: data.paymentDoorCard === true,
    paymentMealCard: data.paymentMealCard === true,
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
    const seoIndexEnabled = p.seoIndexEnabled === true;

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
      seoIndexEnabled,
      hoursDayMode,
      openTime,
      closeTime,
      paymentCash,
      paymentDoorCard,
      paymentMealCard,
    };
  } catch {
    return null;
  }
}

export function clearLocalTenant(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_TENANT_STORAGE_KEY);
}
