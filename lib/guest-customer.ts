import {
  emptyCustomerAddress,
  formValuesToAddress,
  type CustomerAddress,
  type CustomerFormValues,
} from "@/lib/customer-address";

const STORAGE_KEY = "kendisepetim_guest_customer_v1";

export type GuestSavedAddress = {
  id: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
};

export type GuestCustomerState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addresses: GuestSavedAddress[];
};

const emptyState = (): GuestCustomerState => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  addresses: [],
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseAddress(raw: unknown): CustomerAddress {
  if (!isRecord(raw)) return emptyCustomerAddress();
  return {
    neighborhood: typeof raw.neighborhood === "string" ? raw.neighborhood : "",
    street: typeof raw.street === "string" ? raw.street : "",
    buildingNo: typeof raw.buildingNo === "string" ? raw.buildingNo : "",
    buildingName: typeof raw.buildingName === "string" ? raw.buildingName : "",
    floor: typeof raw.floor === "string" ? raw.floor : "",
    apartmentNo: typeof raw.apartmentNo === "string" ? raw.apartmentNo : "",
    livesInSite: raw.livesInSite === true,
    siteName: typeof raw.siteName === "string" ? raw.siteName : "",
    block: typeof raw.block === "string" ? raw.block : "",
  };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getGuestCustomer(): GuestCustomerState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p)) return emptyState();
    const addresses: GuestSavedAddress[] = [];
    if (Array.isArray(p.addresses)) {
      for (const row of p.addresses) {
        if (!isRecord(row) || typeof row.id !== "string") continue;
        addresses.push({
          id: row.id,
          label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : "Adres",
          address: parseAddress(row.address),
          isDefault: row.isDefault === true,
        });
      }
    }
    return {
      firstName: typeof p.firstName === "string" ? p.firstName : "",
      lastName: typeof p.lastName === "string" ? p.lastName : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      email: typeof p.email === "string" ? p.email : "",
      addresses,
    };
  } catch {
    return emptyState();
  }
}

export function saveGuestCustomer(state: GuestCustomerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveGuestProfile(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}): GuestCustomerState {
  const cur = getGuestCustomer();
  const next: GuestCustomerState = {
    ...cur,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
  };
  saveGuestCustomer(next);
  return next;
}

export function upsertGuestAddress(input: {
  id?: string;
  label: string;
  address: CustomerAddress;
  isDefault: boolean;
}): GuestCustomerState {
  const cur = getGuestCustomer();
  const id = input.id ?? newId();
  const row: GuestSavedAddress = {
    id,
    label: input.label.trim() || "Adres",
    address: input.address,
    isDefault: input.isDefault,
  };
  let addresses = cur.addresses.map((a) =>
    a.id === id ? row : input.isDefault ? { ...a, isDefault: false } : a,
  );
  if (!cur.addresses.some((a) => a.id === id)) {
    if (input.isDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    addresses = [row, ...addresses];
  }
  const next = { ...cur, addresses };
  saveGuestCustomer(next);
  return next;
}

export function deleteGuestAddress(id: string): GuestCustomerState {
  const cur = getGuestCustomer();
  const next = { ...cur, addresses: cur.addresses.filter((a) => a.id !== id) };
  saveGuestCustomer(next);
  return next;
}

/** Sipariş sonrası cihaz kaydı — mevcut QR oturumuyla birlikte tutulur. */
export function saveGuestFromCheckout(
  values: CustomerFormValues,
  fulfillmentType: string,
): void {
  const cur = getGuestCustomer();
  const next: GuestCustomerState = {
    ...cur,
    firstName: values.firstName.trim() || cur.firstName,
    lastName: values.lastName.trim() || cur.lastName,
    phone: values.phone.trim() || cur.phone,
    email: values.email.trim() || cur.email,
    addresses: cur.addresses,
  };

  if (fulfillmentType === "delivery") {
    const address = formValuesToAddress(values);
    const same = next.addresses.find(
      (a) =>
        a.address.neighborhood === address.neighborhood &&
        a.address.street === address.street &&
        a.address.buildingNo === address.buildingNo &&
        a.address.apartmentNo === address.apartmentNo,
    );
    if (!same) {
      const makeDefault = next.addresses.length === 0;
      next.addresses = [
        {
          id: newId(),
          label: makeDefault ? "Ev" : "Adres",
          address,
          isDefault: makeDefault,
        },
        ...next.addresses,
      ];
    }
  }

  saveGuestCustomer(next);
}

export function guestDefaultAddress(state: GuestCustomerState): GuestSavedAddress | null {
  return state.addresses.find((a) => a.isDefault) ?? state.addresses[0] ?? null;
}
