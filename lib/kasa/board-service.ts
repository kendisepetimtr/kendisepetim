/**
 * Kasa tahtası: fiziksel masalar + dinamik gel-al slotları.
 * Gel-al slot sayısı = açık gel-al siparişi + 1 (yeni sipariş için her zaman boş kart).
 */

import { loadGarsonTableGrid, type GarsonTableCell } from "@/lib/garson/tables-service";
import { loadKasaPickupOrders } from "@/lib/kasa/pickup-orders-service";
import type { AdminOrder } from "@/lib/orders";

export type KasaPickupSlot = {
  /** Görünen sıra: Gel-Al 1, Gel-Al 2… */
  slotNumber: number;
  orderId: string | null;
  orderCode: string | null;
  customerLabel: string;
  phone: string;
  total: number;
  orderCount: number;
  status: "empty" | "active";
};

export type KasaBoard = {
  tables: GarsonTableCell[];
  pickupSlots: KasaPickupSlot[];
  pickupEnabled: boolean;
  dineInEnabled: boolean;
};

export function buildPickupSlots(openOrders: AdminOrder[]): KasaPickupSlot[] {
  const slots: KasaPickupSlot[] = openOrders.map((order, i) => ({
    slotNumber: i + 1,
    orderId: order.id,
    orderCode: order.orderCode,
    customerLabel: [order.firstName, order.lastName].filter(Boolean).join(" ").trim() || "Gel-Al",
    phone: order.phone || "",
    total: order.total,
    orderCount: 1,
    status: "active" as const,
  }));

  slots.push({
    slotNumber: slots.length + 1,
    orderId: null,
    orderCode: null,
    customerLabel: "",
    phone: "",
    total: 0,
    orderCount: 0,
    status: "empty",
  });

  return slots;
}

export async function loadKasaBoard(
  tenantId: string,
  tableCount: number,
  opts: { dineInEnabled: boolean; pickupEnabled: boolean },
): Promise<{ ok: true; board: KasaBoard } | { ok: false; error: string }> {
  let tables: GarsonTableCell[] = [];

  if (opts.dineInEnabled && tableCount > 0) {
    const grid = await loadGarsonTableGrid(tenantId, tableCount);
    if (!grid.ok) return grid;
    tables = grid.tables;
  }

  let pickupSlots: KasaPickupSlot[] = [];
  if (opts.pickupEnabled) {
    const pickup = await loadKasaPickupOrders(tenantId);
    if (!pickup.ok) return pickup;
    pickupSlots = buildPickupSlots(pickup.orders);
  }

  return {
    ok: true,
    board: {
      tables,
      pickupSlots,
      pickupEnabled: opts.pickupEnabled,
      dineInEnabled: opts.dineInEnabled,
    },
  };
}
