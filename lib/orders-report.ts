import type { CheckoutPaymentMethod } from "@/lib/tenant-payment";
import type { AdminOrder } from "@/lib/orders";
import { DEFAULT_OPEN_TIME, normalizeTimeString, parseTimeToMinutes, type BusinessHoursDayMode } from "@/lib/business-hours";

export type ReportPeriod = "7d" | "30d" | "all";
export type ReportDayConfig = {
  hoursDayMode?: BusinessHoursDayMode;
  openTime?: string;
  closeTime?: string;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function orderAt(o: AdminOrder): Date {
  return new Date(o.createdAt);
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getOpenMinutes(config?: ReportDayConfig): number {
  const openTime = normalizeTimeString(config?.openTime ?? DEFAULT_OPEN_TIME, DEFAULT_OPEN_TIME);
  return parseTimeToMinutes(openTime) ?? 0;
}

export function getReportDayStart(now: Date = new Date(), config?: ReportDayConfig): Date {
  if (config?.hoursDayMode !== "shift") {
    return startOfLocalDay(now);
  }

  const openMinutes = getOpenMinutes(config);
  const start = new Date(now.getTime());
  start.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
  if (now.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

export function getReportDayKey(d: Date, config?: ReportDayConfig): string {
  return localDayKey(getReportDayStart(d, config));
}

export type ReportDayRange = {
  start: Date;
  end: Date;
  dayKey: string;
  offsetDays: number;
};

/** offsetDays=0 bugünkü iş günü, 1 dün, … */
export function getReportDayRange(
  offsetDays: number,
  config?: ReportDayConfig,
  now: Date = new Date(),
): ReportDayRange {
  const start = getReportDayStart(now, config);
  start.setDate(start.getDate() - offsetDays);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 1);
  return { start, end, dayKey: localDayKey(start), offsetDays };
}

export type ReportDayStripItem = {
  offsetDays: number;
  dayKey: string;
  label: string;
  shortLabel: string;
};

/** Tarih çubuğu: Bugün / Dün / … (seçili gün sonu moduna göre). */
export function buildReportDayStrip(
  dayCount = 7,
  config?: ReportDayConfig,
  now: Date = new Date(),
): ReportDayStripItem[] {
  const count = Math.max(1, Math.min(31, dayCount));
  const items: ReportDayStripItem[] = [];
  for (let offset = 0; offset < count; offset++) {
    const { start, dayKey } = getReportDayRange(offset, config, now);
    const shortLabel =
      offset === 0 ? "Bugün" : offset === 1 ? "Dün" : start.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const weekday = start.toLocaleDateString("tr-TR", { weekday: "short" });
    const datePart = start.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const label =
      offset === 0
        ? `Bugün · ${datePart}`
        : offset === 1
          ? `Dün · ${datePart}`
          : `${weekday} · ${datePart}`;
    items.push({ offsetDays: offset, dayKey, label, shortLabel });
  }
  return items;
}

export function reportDayModeLabel(config?: ReportDayConfig): string {
  return config?.hoursDayMode === "shift" ? "Vardiya / mesai" : "Takvim günü";
}

/** Kapanış ödemesi varsa onu kullan (ciro / ödeme dağılımı). */
export function effectivePaymentMethod(order: AdminOrder): CheckoutPaymentMethod {
  return order.paymentMethodAtClose ?? order.paymentMethod;
}

export function getOrdersForRelativeReportDay(
  orders: AdminOrder[],
  offsetDays: number,
  config?: ReportDayConfig,
  now: Date = new Date(),
): AdminOrder[] {
  const { start, end } = getReportDayRange(offsetDays, config, now);
  return orders.filter((order) => {
    const createdAt = orderAt(order);
    return createdAt >= start && createdAt < end;
  });
}

/** Kapanış anına (paid_at) göre iş günü filtresi; yoksa created_at. */
export function filterOrdersByPaidReportDay(
  orders: AdminOrder[],
  offsetDays: number,
  config?: ReportDayConfig,
  now: Date = new Date(),
): AdminOrder[] {
  const { start, end } = getReportDayRange(offsetDays, config, now);
  return orders.filter((order) => {
    const at = new Date(order.paidAt || order.createdAt);
    return at >= start && at < end;
  });
}

export function filterOrdersByPeriod(
  orders: AdminOrder[],
  period: ReportPeriod,
  now = new Date(),
  config?: ReportDayConfig,
): AdminOrder[] {
  if (period === "all") return [...orders];
  const days = period === "7d" ? 7 : 30;
  const start = getReportDayStart(now, config);
  start.setDate(start.getDate() - (days - 1));
  return orders.filter((o) => orderAt(o) >= start);
}

export type PaymentBreakdownRow = {
  method: CheckoutPaymentMethod;
  orderCount: number;
  revenue: number;
};

export type TopProductRow = {
  key: string;
  name: string;
  qty: number;
  revenue: number;
};

export type DaySeriesRow = {
  dayKey: string;
  label: string;
  orderCount: number;
  revenue: number;
};

export type OrdersReportSummary = {
  orderCount: number;
  revenueTotal: number;
  avgBasket: number;
  distinctProducts: number;
  byPayment: PaymentBreakdownRow[];
  topByQty: TopProductRow[];
  topByRevenue: TopProductRow[];
  byDay: DaySeriesRow[];
};

const PAYMENT_ORDER: CheckoutPaymentMethod[] = ["cash", "door_card", "meal_card", "havale"];

function lineRevenue(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

export type ChannelRevenueBucket = { count: number; revenue: number };
export type ChannelRevenueSummary = Record<"pickup" | "delivery" | "dine_in", ChannelRevenueBucket>;

export function buildChannelRevenueSummary(orders: AdminOrder[]): ChannelRevenueSummary {
  const buckets: ChannelRevenueSummary = {
    pickup: { count: 0, revenue: 0 },
    delivery: { count: 0, revenue: 0 },
    dine_in: { count: 0, revenue: 0 },
  };
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const bucket = buckets[order.fulfillmentType];
    bucket.count += 1;
    bucket.revenue += Number.isFinite(order.total) ? order.total : 0;
  }
  for (const key of Object.keys(buckets) as (keyof ChannelRevenueSummary)[]) {
    buckets[key].revenue = Math.round(buckets[key].revenue * 100) / 100;
  }
  return buckets;
}

export function buildOrdersReportSummary(orders: AdminOrder[], config?: ReportDayConfig): OrdersReportSummary {
  const orderCount = orders.length;
  const revenueTotal =
    Math.round(orders.reduce((sum, order) => sum + (Number.isFinite(order.total) ? order.total : 0), 0) * 100) / 100;
  const avgBasket = orderCount > 0 ? Math.round((revenueTotal / orderCount) * 100) / 100 : 0;

  const paymentMap = new Map<CheckoutPaymentMethod, { orderCount: number; revenue: number }>();
  for (const method of PAYMENT_ORDER) {
    paymentMap.set(method, { orderCount: 0, revenue: 0 });
  }
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const method = effectivePaymentMethod(order);
    const current = paymentMap.get(method) ?? { orderCount: 0, revenue: 0 };
    current.orderCount += 1;
    current.revenue += Number.isFinite(order.total) ? order.total : 0;
    paymentMap.set(method, current);
  }

  const byPayment = PAYMENT_ORDER.map((method) => {
    const value = paymentMap.get(method)!;
    return {
      method,
      orderCount: value.orderCount,
      revenue: Math.round(value.revenue * 100) / 100,
    };
  }).filter((row) => row.orderCount > 0);

  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders) {
    for (const line of order.lines) {
      const key = line.productId || line.name;
      const existing = productAgg.get(key) ?? { name: line.name || "Ürün", qty: 0, revenue: 0 };
      existing.qty += line.qty;
      existing.revenue = Math.round((existing.revenue + lineRevenue(line.qty, line.unitPrice)) * 100) / 100;
      productAgg.set(key, existing);
    }
  }

  const productRows = [...productAgg.entries()].map(([key, value]) => ({
    key,
    name: value.name,
    qty: value.qty,
    revenue: value.revenue,
  }));

  const dayMap = new Map<string, { orderCount: number; revenue: number }>();
  for (const order of orders) {
    const key = getReportDayKey(orderAt(order), config);
    const current = dayMap.get(key) ?? { orderCount: 0, revenue: 0 };
    current.orderCount += 1;
    current.revenue += Number.isFinite(order.total) ? order.total : 0;
    dayMap.set(key, current);
  }

  const byDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, value]) => {
      const [y, m, d] = dayKey.split("-").map(Number);
      return {
        dayKey,
        label: new Date(y, m - 1, d).toLocaleDateString("tr-TR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        orderCount: value.orderCount,
        revenue: Math.round(value.revenue * 100) / 100,
      };
    });

  return {
    orderCount,
    revenueTotal,
    avgBasket,
    distinctProducts: productAgg.size,
    byPayment,
    topByQty: [...productRows].sort((a, b) => b.qty - a.qty).slice(0, 10),
    topByRevenue: [...productRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    byDay,
  };
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
