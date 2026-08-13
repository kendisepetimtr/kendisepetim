import type { CustomerAddress } from "@/lib/customer-address";

const STORAGE_KEY = "kendisepetim_guest_favorites_v1";

export type FavoriteKind = "restaurant" | "product";

export type GuestFavorite = {
  id: string;
  kind: FavoriteKind;
  subdomain: string;
  productId?: string;
  productName?: string;
  restaurantName: string;
  createdAt: string;
};

export type GuestFavoritesState = {
  items: GuestFavorite[];
};

function empty(): GuestFavoritesState {
  return { items: [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getGuestFavorites(): GuestFavoritesState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p) || !Array.isArray(p.items)) return empty();
    const items: GuestFavorite[] = [];
    for (const row of p.items) {
      if (!isRecord(row) || typeof row.subdomain !== "string") continue;
      const kind = row.kind === "product" ? "product" : row.kind === "restaurant" ? "restaurant" : null;
      if (!kind) continue;
      items.push({
        id: typeof row.id === "string" ? row.id : newId(),
        kind,
        subdomain: row.subdomain.toLowerCase(),
        productId: typeof row.productId === "string" ? row.productId : undefined,
        productName: typeof row.productName === "string" ? row.productName : undefined,
        restaurantName: typeof row.restaurantName === "string" ? row.restaurantName : row.subdomain,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      });
    }
    return { items };
  } catch {
    return empty();
  }
}

export function saveGuestFavorites(state: GuestFavoritesState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isProductFavorited(subdomain: string, productId: string): boolean {
  const s = subdomain.toLowerCase();
  return getGuestFavorites().items.some(
    (i) => i.kind === "product" && i.subdomain === s && i.productId === productId,
  );
}

export function isRestaurantFavorited(subdomain: string): boolean {
  const s = subdomain.toLowerCase();
  return getGuestFavorites().items.some((i) => i.kind === "restaurant" && i.subdomain === s);
}

export function toggleGuestProductFavorite(input: {
  subdomain: string;
  productId: string;
  productName: string;
  restaurantName: string;
}): boolean {
  const cur = getGuestFavorites();
  const s = input.subdomain.toLowerCase();
  const exists = cur.items.find(
    (i) => i.kind === "product" && i.subdomain === s && i.productId === input.productId,
  );
  if (exists) {
    saveGuestFavorites({ items: cur.items.filter((i) => i.id !== exists.id) });
    return false;
  }
  saveGuestFavorites({
    items: [
      {
        id: newId(),
        kind: "product",
        subdomain: s,
        productId: input.productId,
        productName: input.productName,
        restaurantName: input.restaurantName,
        createdAt: new Date().toISOString(),
      },
      ...cur.items,
    ],
  });
  return true;
}

export function toggleGuestRestaurantFavorite(input: {
  subdomain: string;
  restaurantName: string;
}): boolean {
  const cur = getGuestFavorites();
  const s = input.subdomain.toLowerCase();
  const exists = cur.items.find((i) => i.kind === "restaurant" && i.subdomain === s);
  if (exists) {
    saveGuestFavorites({ items: cur.items.filter((i) => i.id !== exists.id) });
    return false;
  }
  saveGuestFavorites({
    items: [
      {
        id: newId(),
        kind: "restaurant",
        subdomain: s,
        restaurantName: input.restaurantName,
        createdAt: new Date().toISOString(),
      },
      ...cur.items,
    ],
  });
  return true;
}

export function clearGuestFavorites(): void {
  saveGuestFavorites(empty());
}

/** Tip uyumu — adres taşırken aynı desende kullanılabilir */
export type GuestFavoriteMigrateRow = GuestFavorite & { address?: CustomerAddress };
