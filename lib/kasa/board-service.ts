/**
 * Kasa tahtası: fiziksel masalar + dinamik gel-al slotları.
 * Gel-al: açık siparişler + 1 boş (yeni) + son kapananlar (farklı renk).
 */

import { loadGarsonTableGrid, type GarsonTableCell } from "@/lib/garson/tables-service";
import {
  loadKasaClosedPickupOrders,
  loadKasaPickupOrders,
} from "@/lib/kasa/pickup-orders-service";
import type { AdminOrder } from "@/lib/orders";
import type { CheckoutPaymentMethod } from "@/lib/tenant-payment";

export type KasaPickupSlot = {
  /** Görünen sıra: Gel-Al 1, Gel-Al 2… */
  slotNumber: number;
  orderId: string | null;
  orderCode: string | null;
  customerLabel: string;
  phone: string;
  total: number;
  orderCount: number;
  status: "empty" | "active" | "closed";
  paidAt?: string | null;
  paymentMethodAtClose?: CheckoutPaymentMethod | null;
};

export type KasaBoard = {
  tables: GarsonTableCell[];
  pickupSlots: KasaPickupSlot[];
  pickupEnabled: boolean;
  dineInEnabled: boolean;
};

export function buildPickupSlots(
  openOrders: AdminOrder[],
  closedOrders: AdminOrder[] = [],
): KasaPickupSlot[] {
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

  const closedStart = slots.length;
  for (let i = 0; i < closedOrders.length; i++) {
    const order = closedOrders[i]!;
    slots.push({
      slotNumber: closedStart + i + 1,
      orderId: order.id,
      orderCode: order.orderCode,
      customerLabel: [order.firstName, order.lastName].filter(Boolean).join(" ").trim() || "Gel-Al",
      phone: order.phone || "",
      total: order.total,
      orderCount: 1,
      status: "closed",
      paidAt: order.paidAt ?? null,
      paymentMethodAtClose: order.paymentMethodAtClose ?? order.paymentMethod,
    });
  }

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
    const [pickup, closed] = await Promise.all([
      loadKasaPickupOrders(tenantId),
      loadKasaClosedPickupOrders(tenantId, 12),
    ]);
    if (!pickup.ok) return pickup;
    if (!closed.ok) return closed;
    pickupSlots = buildPickupSlots(pickup.orders, closed.orders);
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
