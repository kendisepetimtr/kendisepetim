import type { CustomerAddress } from "@/lib/customer-address";
import type { CheckoutPaymentMethod } from "@/lib/tenant-payment";
import type { MealCardBrandId } from "@/lib/tenant-payment";

export const localOrdersStorageKey = (subdomain: string) =>
  `kendisepetim_orders_v1_${subdomain.toLowerCase()}`;

export type LocalOrderLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  removedIngredients?: string[];
};

export type LocalOrder = {
  id: string;
  subdomain: string;
  createdAt: string;
  orderSource: string;
  lines: LocalOrderLine[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: CustomerAddress;
  paymentMethod: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
  /** Müşteri notu + isteğe bağlı konum satırı */
  orderNote: string;
};

export type LocalOrdersState = { orders: LocalOrder[] };

const empty: LocalOrdersState = { orders: [] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseAddress(r: Record<string, unknown>): CustomerAddress {
  return {
    neighborhood: typeof r.neighborhood === "string" ? r.neighborhood : "",
    street: typeof r.street === "string" ? r.street : "",
    buildingNo: typeof r.buildingNo === "string" ? r.buildingNo : "",
    buildingName: typeof r.buildingName === "string" ? r.buildingName : "",
    floor: typeof r.floor === "string" ? r.floor : "",
    apartmentNo: typeof r.apartmentNo === "string" ? r.apartmentNo : "",
    livesInSite: r.livesInSite === true,
    siteName: typeof r.siteName === "string" ? r.siteName : "",
    block: typeof r.block === "string" ? r.block : "",
  };
}

export function getLocalOrders(subdomain: string): LocalOrdersState {
  if (typeof window === "undefined") return { ...empty };
  const raw = window.localStorage.getItem(localOrdersStorageKey(subdomain));
  if (!raw) return { ...empty };
  try {
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p)) return { ...empty };
    const arr = Array.isArray(p.orders) ? p.orders : [];
    const orders: LocalOrder[] = [];
    for (const row of arr) {
      if (!isRecord(row)) continue;
      if (typeof row.id !== "string" || typeof row.createdAt !== "string") continue;
      const addr = isRecord(row.address) ? parseAddress(row.address) : parseAddress({});
      const pm = row.paymentMethod;
      const paymentMethod: CheckoutPaymentMethod =
        pm === "cash" || pm === "door_card" || pm === "meal_card" ? pm : "cash";
      const mealRaw = row.mealCardBrandId;
      const mealCardBrandId =
        mealRaw === "multinet" || mealRaw === "sodexo" || mealRaw === "edenred" ? mealRaw : undefined;
      const lines: LocalOrderLine[] = [];
      if (Array.isArray(row.lines)) {
        for (const ln of row.lines) {
          if (!isRecord(ln)) continue;
          lines.push({
            productId: typeof ln.productId === "string" ? ln.productId : "",
            name: typeof ln.name === "string" ? ln.name : "",
            qty: typeof ln.qty === "number" && ln.qty > 0 ? ln.qty : 1,
            unitPrice: typeof ln.unitPrice === "number" && Number.isFinite(ln.unitPrice) ? ln.unitPrice : 0,
            removedIngredients: Array.isArray(ln.removedIngredients)
              ? ln.removedIngredients.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
              : undefined,
          });
        }
      }
      orders.push({
        id: row.id,
        subdomain: typeof row.subdomain === "string" ? row.subdomain : subdomain,
        createdAt: row.createdAt,
        orderSource: typeof row.orderSource === "string" ? row.orderSource : "qr_menu",
        lines,
        total: typeof row.total === "number" && Number.isFinite(row.total) ? row.total : 0,
        firstName: typeof row.firstName === "string" ? row.firstName : "",
        lastName: typeof row.lastName === "string" ? row.lastName : "",
        phone: typeof row.phone === "string" ? row.phone : "",
        email: typeof row.email === "string" ? row.email : "",
        address: addr,
        paymentMethod,
        mealCardBrandId: paymentMethod === "meal_card" ? mealCardBrandId : undefined,
        orderNote: typeof row.orderNote === "string" ? row.orderNote : "",
      });
    }
    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { orders };
  } catch {
    return { ...empty };
  }
}

export function saveLocalOrders(subdomain: string, state: LocalOrdersState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localOrdersStorageKey(subdomain), JSON.stringify(state));
}

export function appendLocalOrder(subdomain: string, order: LocalOrder): void {
  const cur = getLocalOrders(subdomain);
  saveLocalOrders(subdomain, { orders: [order, ...cur.orders] });
}

export function clearLocalOrders(subdomain: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(localOrdersStorageKey(subdomain));
}
