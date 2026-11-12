import type { KasaFeatures } from "@/lib/kasa/kasa-access";

/** Kasa ve Admin sipariş operasyonu için ortak yüzey (yol + API + kabuk). */
export type OpsSurface = {
  /** Örn. /kasa veya /admin */
  basePath: string;
  /** Örn. /api/kasa */
  apiBase: string;
  streamUrl: string;
  /** Üst etiket: Kasa / Admin */
  brandLabel: string;
  /** Kabuk menü davranışı */
  shell: "kasa" | "admin";
};

export const KASA_OPS_SURFACE: OpsSurface = {
  basePath: "/kasa",
  apiBase: "/api/kasa",
  streamUrl: "/api/kasa/notifications/stream",
  brandLabel: "Kasa",
  shell: "kasa",
};

export const ADMIN_OPS_SURFACE: OpsSurface = {
  basePath: "/admin",
  apiBase: "/api/kasa",
  streamUrl: "/api/kasa/notifications/stream",
  brandLabel: "Admin",
  shell: "admin",
};

export function opsBoardPath(surface: OpsSurface): string {
  return surface.basePath;
}

export function opsPaketPath(surface: OpsSurface, tab?: "active" | "history"): string {
  const base = `${surface.basePath}/paket`;
  if (tab === "history") return `${base}?tab=history`;
  return base;
}

export function opsGelAlPath(surface: OpsSurface, orderId: string, history = false): string {
  const base = `${surface.basePath}/gel-al/${orderId}`;
  return history ? `${base}?view=history` : base;
}

export function opsPaketOrderPath(surface: OpsSurface, orderId: string, history = false): string {
  const base = `${surface.basePath}/paket/${orderId}`;
  return history ? `${base}?view=history` : base;
}

export function opsMasaPath(surface: OpsSurface, tableNumber: number): string {
  return `${surface.basePath}/masa/${tableNumber}`;
}

export function opsSiparislerPath(surface: OpsSurface): string {
  return surface.shell === "admin" ? `${surface.basePath}/siparisler` : surface.basePath;
}

export function getDefaultOpsPath(features: KasaFeatures, surface: OpsSurface): string {
  if (features.dineIn || features.pickup) return opsSiparislerPath(surface);
  if (features.delivery) return opsPaketPath(surface);
  return opsSiparislerPath(surface);
}

export function closedOrderHref(surface: OpsSurface, fulfillmentType: string, orderId: string): string | null {
  if (fulfillmentType === "pickup") return opsGelAlPath(surface, orderId, true);
  if (fulfillmentType === "delivery") return opsPaketOrderPath(surface, orderId, true);
  return null;
}
