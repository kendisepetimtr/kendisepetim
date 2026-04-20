import type { CheckoutPaymentMethod } from "@/lib/tenant-payment";
import type { LocalOrder } from "@/lib/local-orders";

export type ReportPeriod = "7d" | "30d" | "all";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function orderAt(o: LocalOrder): Date {
  return new Date(o.createdAt);
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Aralığa göre siparişleri süzer (takvim günü, yerel saat). */
export function filterOrdersByPeriod(orders: LocalOrder[], period: ReportPeriod, now = new Date()): LocalOrder[] {
  if (period === "all") return [...orders];
  const days = period === "7d" ? 7 : 30;
  const start = startOfLocalDay(now);
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
  /** Sipariş satırlarında geçen farklı ürün anahtarı sayısı */
  distinctProducts: number;
  byPayment: PaymentBreakdownRow[];
  topByQty: TopProductRow[];
  topByRevenue: TopProductRow[];
  byDay: DaySeriesRow[];
};

const PAYMENT_ORDER: CheckoutPaymentMethod[] = ["cash", "door_card", "meal_card"];

function lineRevenue(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

/** Filtrelenmiş sipariş listesinden özet üretir. */
export function buildOrdersReportSummary(orders: LocalOrder[]): OrdersReportSummary {
  const orderCount = orders.length;
  const revenueTotal =
    Math.round(orders.reduce((s, o) => s + (Number.isFinite(o.total) ? o.total : 0), 0) * 100) / 100;
  const avgBasket = orderCount > 0 ? Math.round((revenueTotal / orderCount) * 100) / 100 : 0;

  const paymentMap = new Map<CheckoutPaymentMethod, { orderCount: number; revenue: number }>();
  for (const m of PAYMENT_ORDER) {
    paymentMap.set(m, { orderCount: 0, revenue: 0 });
  }
  for (const o of orders) {
    const pm: CheckoutPaymentMethod =
      o.paymentMethod === "cash" || o.paymentMethod === "door_card" || o.paymentMethod === "meal_card"
        ? o.paymentMethod
        : "cash";
    const cur = paymentMap.get(pm)!;
    cur.orderCount += 1;
    cur.revenue += Number.isFinite(o.total) ? o.total : 0;
  }
  const byPayment: PaymentBreakdownRow[] = PAYMENT_ORDER.map((method) => {
    const v = paymentMap.get(method)!;
    return {
      method,
      orderCount: v.orderCount,
      revenue: Math.round(v.revenue * 100) / 100,
    };
  }).filter((r) => r.orderCount > 0);

  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const ln of o.lines) {
      const key = ln.productId || ln.name;
      const name = ln.name || "Ürün";
      const prev = productAgg.get(key) ?? { name, qty: 0, revenue: 0 };
      const addQty = ln.qty > 0 ? ln.qty : 1;
      const addRev = lineRevenue(addQty, ln.unitPrice);
      prev.qty += addQty;
      prev.revenue = Math.round((prev.revenue + addRev) * 100) / 100;
      if (!prev.name && name) prev.name = name;
      productAgg.set(key, prev);
    }
  }
  const productRows: TopProductRow[] = [...productAgg.entries()].map(([key, v]) => ({
    key,
    name: v.name,
    qty: v.qty,
    revenue: v.revenue,
  }));
  const distinctProducts = productAgg.size;
  const topByQty = [...productRows].sort((a, b) => b.qty - a.qty).slice(0, 10);
  const topByRevenue = [...productRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const dayMap = new Map<string, { orderCount: number; revenue: number }>();
  for (const o of orders) {
    const dk = localDayKey(orderAt(o));
    const cur = dayMap.get(dk) ?? { orderCount: 0, revenue: 0 };
    cur.orderCount += 1;
    cur.revenue += Number.isFinite(o.total) ? o.total : 0;
    dayMap.set(dk, cur);
  }
  const byDay: DaySeriesRow[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, v]) => {
      const [y, m, d] = dayKey.split("-").map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString("tr-TR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return {
        dayKey,
        label,
        orderCount: v.orderCount,
        revenue: Math.round(v.revenue * 100) / 100,
      };
    });

  return {
    orderCount,
    revenueTotal,
    avgBasket,
    distinctProducts,
    byPayment,
    topByQty,
    topByRevenue,
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
