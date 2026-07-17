/**
 * Kasa tahtası: fiziksel masalar + dinamik gel-al slotları + iş gününe göre kapananlar.
 * Gel-al: önce sipariş (açık kalır) → müşteri öder → kasa kapatır.
 * Kapananlar: masa / gel-al / paket aynı bölümde, kanala göre farklı renk; tarih çubuğu ile gün seçilir.
 */

import { loadGarsonTableGrid, type GarsonTableCell } from "@/lib/garson/tables-service";
import { loadKasaClosedOrdersForBusinessDay } from "@/lib/kasa/closed-orders-service";
import { loadKasaPickupOrders } from "@/lib/kasa/pickup-orders-service";
import type { FulfillmentType } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import {
  buildReportDayStrip,
  reportDayModeLabel,
  type ReportDayConfig,
  type ReportDayStripItem,
} from "@/lib/orders-report";
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

export type KasaClosedOrderCard = {
  orderId: string;
  orderCode: string;
  fulfillmentType: FulfillmentType;
  customerLabel: string;
  tableNumber: number | null;
  total: number;
  paidAt: string | null;
  paymentMethodAtClose: CheckoutPaymentMethod | null;
};

export type KasaBoard = {
  tables: GarsonTableCell[];
  pickupSlots: KasaPickupSlot[];
  closedOrders: KasaClosedOrderCard[];
  closedDayOffset: number;
  dayStrip: ReportDayStripItem[];
  dayModeLabel: string;
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

export function mapClosedOrderCards(orders: AdminOrder[]): KasaClosedOrderCard[] {
  return orders.map((order) => {
    const name = [order.firstName, order.lastName].filter(Boolean).join(" ").trim();
    let customerLabel = name;
    if (order.fulfillmentType === "dine_in") {
      customerLabel = order.tableNumber != null ? `Masa ${order.tableNumber}` : name || "Masa";
    } else if (order.fulfillmentType === "pickup") {
      customerLabel = name || "Gel-Al";
    } else if (!customerLabel) {
      customerLabel = "Paket";
    }
    return {
      orderId: order.id,
      orderCode: order.orderCode,
      fulfillmentType: order.fulfillmentType,
      customerLabel,
      tableNumber: order.tableNumber,
      total: order.total,
      paidAt: order.paidAt ?? null,
      paymentMethodAtClose: order.paymentMethodAtClose ?? order.paymentMethod,
    };
  });
}

export async function loadKasaBoard(
  tenantId: string,
  tableCount: number,
  opts: {
    dineInEnabled: boolean;
    pickupEnabled: boolean;
    dayOffset?: number;
    reportDayConfig?: ReportDayConfig;
  },
): Promise<{ ok: true; board: KasaBoard } | { ok: false; error: string }> {
  const dayOffset = Math.max(0, Math.min(30, opts.dayOffset ?? 0));
  const reportDayConfig = opts.reportDayConfig;
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

  const closed = await loadKasaClosedOrdersForBusinessDay(tenantId, dayOffset, reportDayConfig, 80);
  if (!closed.ok) return closed;

  return {
    ok: true,
    board: {
      tables,
      pickupSlots,
      closedOrders: mapClosedOrderCards(closed.orders),
      closedDayOffset: dayOffset,
      dayStrip: buildReportDayStrip(7, reportDayConfig),
      dayModeLabel: reportDayModeLabel(reportDayConfig),
      pickupEnabled: opts.pickupEnabled,
      dineInEnabled: opts.dineInEnabled,
    },
  };
}
