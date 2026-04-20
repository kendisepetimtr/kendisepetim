import type { CustomerFormValues } from "@/lib/customer-address";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";

const key = (subdomain: string) => `kendisepetim_qr_checkout_session_v1_${subdomain.toLowerCase()}`;

export type QrCheckoutSession = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  neighborhood: string;
  street: string;
  buildingNo: string;
  buildingName: string;
  floor: string;
  apartmentNo: string;
  livesInSite: boolean;
  siteName: string;
  block: string;
  lastPaymentMethod: CheckoutPaymentMethod | "";
  lastMealCardBrandId: MealCardBrandId | "";
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadQrCheckoutSession(subdomain: string): Partial<CustomerFormValues> & {
  lastPaymentMethod?: CheckoutPaymentMethod | "";
  lastMealCardBrandId?: MealCardBrandId | "";
} {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key(subdomain));
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p)) return {};
    return {
      firstName: typeof p.firstName === "string" ? p.firstName : "",
      lastName: typeof p.lastName === "string" ? p.lastName : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      email: typeof p.email === "string" ? p.email : "",
      neighborhood: typeof p.neighborhood === "string" ? p.neighborhood : "",
      street: typeof p.street === "string" ? p.street : "",
      buildingNo: typeof p.buildingNo === "string" ? p.buildingNo : "",
      buildingName: typeof p.buildingName === "string" ? p.buildingName : "",
      floor: typeof p.floor === "string" ? p.floor : "",
      apartmentNo: typeof p.apartmentNo === "string" ? p.apartmentNo : "",
      livesInSite: p.livesInSite === true,
      siteName: typeof p.siteName === "string" ? p.siteName : "",
      block: typeof p.block === "string" ? p.block : "",
      lastPaymentMethod:
        p.lastPaymentMethod === "cash" || p.lastPaymentMethod === "door_card" || p.lastPaymentMethod === "meal_card"
          ? p.lastPaymentMethod
          : "",
      lastMealCardBrandId:
        p.lastMealCardBrandId === "multinet" ||
        p.lastMealCardBrandId === "sodexo" ||
        p.lastMealCardBrandId === "edenred"
          ? p.lastMealCardBrandId
          : "",
    };
  } catch {
    return {};
  }
}

export function saveQrCheckoutSession(
  subdomain: string,
  values: CustomerFormValues,
  payment: { method: CheckoutPaymentMethod; mealCardBrandId?: MealCardBrandId },
): void {
  if (typeof window === "undefined") return;
  const payload: QrCheckoutSession = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    neighborhood: values.neighborhood.trim(),
    street: values.street.trim(),
    buildingNo: values.buildingNo.trim(),
    buildingName: values.buildingName.trim(),
    floor: values.floor.trim(),
    apartmentNo: values.apartmentNo.trim(),
    livesInSite: values.livesInSite,
    siteName: values.siteName.trim(),
    block: values.block.trim(),
    lastPaymentMethod: payment.method,
    lastMealCardBrandId:
      payment.method === "meal_card" && payment.mealCardBrandId ? payment.mealCardBrandId : "",
  };
  window.localStorage.setItem(key(subdomain), JSON.stringify(payload));
}

export function clearQrCheckoutSession(subdomain: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(subdomain));
}
