import {
  emptyCustomerAddress,
  formValuesToAddress,
  type CustomerAddress,
  type CustomerFormValues,
} from "@/lib/customer-address";
import type { CheckoutPaymentMethod } from "@/lib/tenant-payment";
import type { MealCardBrandId } from "@/lib/tenant-payment";

export type { CustomerAddress } from "@/lib/customer-address";

export const localCustomersStorageKey = (subdomain: string) => `kendisepetim_customers_v1_${subdomain}`;

export type LocalCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  /** Sistem tarafından (örn. qr_menu, panel_manual) */
  orderSource: string;
  createdAt: string;
  updatedAt: string;
  lastPaymentMethod?: CheckoutPaymentMethod;
  lastMealCardBrandId?: MealCardBrandId;
};

export type LocalCustomersState = {
  customers: LocalCustomer[];
};

const emptyState: LocalCustomersState = { customers: [] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeAddressFromUnknown(a: unknown): CustomerAddress {
  if (!isRecord(a)) return emptyCustomerAddress();
  return {
    neighborhood: typeof a.neighborhood === "string" ? a.neighborhood.trim() : "",
    street: typeof a.street === "string" ? a.street.trim() : "",
    buildingNo: typeof a.buildingNo === "string" ? a.buildingNo.trim() : "",
    buildingName: typeof a.buildingName === "string" ? a.buildingName.trim() : "",
    floor: typeof a.floor === "string" ? a.floor.trim() : "",
    apartmentNo: typeof a.apartmentNo === "string" ? a.apartmentNo.trim() : "",
    livesInSite: a.livesInSite === true,
    siteName: typeof a.siteName === "string" ? a.siteName.trim() : "",
    block: typeof a.block === "string" ? a.block.trim() : "",
  };
}

function migrateLegacyAddressString(legacy: string): CustomerAddress {
  const t = legacy.trim();
  if (!t) return emptyCustomerAddress();
  return { ...emptyCustomerAddress(), street: t };
}

function normalizeCustomer(c: Record<string, unknown>): LocalCustomer | null {
  if (typeof c.id !== "string") return null;
  const firstName = typeof c.firstName === "string" ? c.firstName.trim() : "";
  const lastName = typeof c.lastName === "string" ? c.lastName.trim() : "";
  if (!firstName && !lastName) return null;

  let address: CustomerAddress;
  if (typeof c.address === "string") {
    address = migrateLegacyAddressString(c.address);
  } else {
    address = normalizeAddressFromUnknown(c.address);
  }

  const pm = c.lastPaymentMethod;
  const lastPaymentMethod: CheckoutPaymentMethod | undefined =
    pm === "cash" || pm === "door_card" || pm === "meal_card" ? pm : undefined;
  const mb = c.lastMealCardBrandId;
  const lastMealCardBrandId: MealCardBrandId | undefined =
    mb === "multinet" || mb === "sodexo" || mb === "edenred" ? mb : undefined;

  return {
    id: c.id,
    firstName: firstName || "—",
    lastName,
    phone: typeof c.phone === "string" ? c.phone.trim() : "",
    email: typeof c.email === "string" ? c.email.trim() : "",
    address,
    orderSource: typeof c.orderSource === "string" ? c.orderSource.trim() : "",
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : new Date().toISOString(),
    lastPaymentMethod,
    lastMealCardBrandId,
  };
}

export function customerToFormValues(c: LocalCustomer): CustomerFormValues {
  const a = c.address;
  return {
    firstName: c.firstName === "—" ? "" : c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    neighborhood: a.neighborhood,
    street: a.street,
    buildingNo: a.buildingNo,
    buildingName: a.buildingName,
    floor: a.floor,
    apartmentNo: a.apartmentNo,
    livesInSite: a.livesInSite,
    siteName: a.siteName,
    block: a.block,
    orderNote: "",
    courierNote: "",
  };
}

export function getLocalCustomers(subdomain: string): LocalCustomersState {
  if (typeof window === "undefined") return { ...emptyState };
  const raw = window.localStorage.getItem(localCustomersStorageKey(subdomain));
  if (!raw) return { ...emptyState };
  try {
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p)) return { ...emptyState };
    const arr = Array.isArray(p.customers) ? p.customers : [];
    const customers: LocalCustomer[] = [];
    for (const row of arr) {
      if (!isRecord(row)) continue;
      const n = normalizeCustomer(row);
      if (n) customers.push(n);
    }
    customers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { customers };
  } catch {
    return { ...emptyState };
  }
}

export function saveLocalCustomers(subdomain: string, state: LocalCustomersState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localCustomersStorageKey(subdomain), JSON.stringify(state));
}

export function clearLocalCustomers(subdomain: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(localCustomersStorageKey(subdomain));
}

export function countLocalCustomers(subdomain: string): number {
  return getLocalCustomers(subdomain).customers.length;
}

function phoneMatchKey(phone: string): string {
  return phone.replace(/\s/g, "").replace(/[^\d+]/g, "");
}

/**
 * Telefon eşleşmesiyle günceller veya yeni kayıt ekler (QR sipariş sonrası).
 */
export function upsertLocalCustomerByPhone(
  subdomain: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: CustomerAddress;
    orderSource: string;
    lastPaymentMethod?: CheckoutPaymentMethod;
    lastMealCardBrandId?: MealCardBrandId;
  },
): void {
  const state = getLocalCustomers(subdomain);
  const key = phoneMatchKey(input.phone);
  const now = new Date().toISOString();
  const idx = state.customers.findIndex((c) => phoneMatchKey(c.phone) === key && key.length > 0);

  if (idx >= 0) {
    const prev = state.customers[idx];
    const next: LocalCustomer = {
      ...prev,
      firstName: input.firstName.trim() || prev.firstName,
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      address: input.address,
      orderSource: input.orderSource,
      updatedAt: now,
      lastPaymentMethod: input.lastPaymentMethod ?? prev.lastPaymentMethod,
      lastMealCardBrandId: input.lastMealCardBrandId ?? prev.lastMealCardBrandId,
    };
    const copy = [...state.customers];
    copy[idx] = next;
    saveLocalCustomers(subdomain, { customers: copy });
    return;
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `cust_${crypto.randomUUID()}`
      : `cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const row: LocalCustomer = {
    id,
    firstName: input.firstName.trim() || "—",
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address,
    orderSource: input.orderSource,
    createdAt: now,
    updatedAt: now,
    lastPaymentMethod: input.lastPaymentMethod,
    lastMealCardBrandId: input.lastMealCardBrandId,
  };
  saveLocalCustomers(subdomain, { customers: [row, ...state.customers] });
}

/** Panelden manuel eklerken */
export function buildCustomerFromForm(
  fields: CustomerFormValues,
  orderSource: string,
  existingId?: string,
): LocalCustomer {
  const now = new Date().toISOString();
  const id =
    existingId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `cust_${crypto.randomUUID()}`
      : `cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  return {
    id,
    firstName: fields.firstName.trim() || "—",
    lastName: fields.lastName.trim(),
    phone: fields.phone.trim(),
    email: fields.email.trim(),
    address: formValuesToAddress(fields),
    orderSource,
    createdAt: now,
    updatedAt: now,
  };
}
