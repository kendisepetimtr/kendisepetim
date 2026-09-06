"use client";

import TenantTrialBanner from "@/components/dashboard/tenant-trial-banner";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatAddressOneLine } from "@/lib/customer-address";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { AdminOrder } from "@/lib/orders";
import { getPrimaryPublicMenuUrl } from "@/lib/public-menu-urls";
import {
  buildChannelRevenueSummary,
  buildOrdersReportSummary,
  buildReportDayStrip,
  effectivePaymentMethod,
  filterOrdersByPaidReportDay,
  filterOrdersByPeriod,
  formatTry,
  getOrdersForRelativeReportDay,
  reportDayModeLabel,
  type ReportPeriod,
  type ReportDayConfig,
} from "@/lib/orders-report";
import type { BusinessHoursDayMode } from "@/lib/business-hours";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import { changeOwnerAdminPinAction, cancelAdminOrderAction } from "@/app/dashboard/admin/actions";
import type { OwnerAdminPinActionState } from "@/app/dashboard/admin/actions";
import CancelOrderDialog from "@/components/orders/cancel-order-dialog";
import type { OrderCancelReason } from "@/lib/order-cancel";
import type { OrderStatus } from "@/lib/supabase/order-types";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTOR_LABELS,
  formatActivityLogSummary,
} from "@/lib/dashboard/activity-log-labels";
import { fulfillmentTypeLabel, type FulfillmentType } from "@/lib/fulfillment";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { useTenantOpsRealtime } from "@/lib/hooks/use-tenant-ops-realtime";

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "7d", label: "Son 7 gün" },
  { id: "30d", label: "Son 30 gün" },
  { id: "all", label: "Tümü" },
];

const STATUS_FILTERS: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "new", label: "Yeni" },
  { id: "confirmed", label: "Onaylandı" },
  { id: "preparing", label: "Hazırlanıyor" },
  { id: "completed", label: "Tamamlandı" },
  { id: "cancelled", label: "İptal" },
];

const CHANNEL_FILTERS: { id: "all" | FulfillmentType; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "pickup", label: "Gel-al" },
  { id: "dine_in", label: "Masa" },
  { id: "delivery", label: "Paket" },
];

const STATUS_LABELS = ORDER_STATUS_LABELS;

const NAV_MAIN = [
  { id: "overview", label: "Özet", icon: "space_dashboard" },
  { id: "orders", label: "Siparişler", icon: "receipt_long" },
  { id: "reports", label: "Raporlar", icon: "bar_chart" },
  { id: "logs", label: "Loglar", icon: "history" },
] as const;

const NAV_SETTINGS = { id: "settings", label: "Ayarlar", icon: "settings" } as const;

type SidebarNavItem = { readonly id: string; readonly label: string; readonly icon: string };
type AdminNavId = (typeof NAV_MAIN)[number]["id"] | typeof NAV_SETTINGS.id;

function NoteWithMapLinks({ text }: { text: string }) {
  if (!text.trim()) return <span className="text-secondary/70">—</span>;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (
    <div className="space-y-2 text-xs leading-relaxed text-secondary">
      {text.split(/\n+/).filter(Boolean).map((para, i) => {
        const parts = para.split(urlRegex);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              /^https?:\/\//.test(part) ? (
                <a
                  key={j}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-container"
                >
                  Haritada aç
                </a>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

function SidebarNavButton({
  item,
  active,
  onSelect,
}: {
  item: SidebarNavItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-[transform,color,background-color] duration-200",
        active ? "bg-primary/10 text-primary" : "text-secondary hover:translate-x-1 hover:bg-surface-container-low hover:text-on-background",
      ].join(" ")}
    >
      <span className={`material-symbols-outlined text-[22px] ${active ? "text-primary" : "text-secondary"}`} aria-hidden>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
}

function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

function getNavLabel(navId: AdminNavId): string {
  if (navId === NAV_SETTINGS.id) return NAV_SETTINGS.label;
  return NAV_MAIN.find((item) => item.id === navId)?.label ?? "Admin";
}

function AdminSidebarBrand({
  businessName,
  subdomain,
  logoUrl,
}: {
  businessName: string;
  subdomain: string;
  logoUrl: string | null;
}) {
  return (
    <a href="/admin" className="flex min-w-0 items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-container-highest bg-white shadow-sm">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="material-symbols-outlined text-3xl text-secondary" aria-hidden>
            store
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-headline text-base font-bold text-on-background">{businessName}</p>
        <p className="mt-0.5 text-xs text-secondary">@{subdomain}</p>
      </div>
    </a>
  );
}

function OwnerAdminPinChangeForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnerAdminPinAction,
    null as OwnerAdminPinActionState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
      <h3 className="font-headline text-lg font-bold text-on-background">PIN değiştir</h3>
      <p className="mt-1 text-sm text-secondary">Mevcut PIN doğrulanır, yeni PIN tüm eski oturumları geçersiz kılar.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          name="currentPin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Mevcut PIN"
          disabled={pending}
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-3 text-sm text-on-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          name="newPin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Yeni PIN"
          disabled={pending}
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-3 text-sm text-on-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          name="confirmPin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Tekrar"
          disabled={pending}
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-3 text-sm text-on-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {state?.error ? (
        <p className="mt-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="mt-3 rounded-lg border border-emerald-600/25 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Güncelleniyor…" : "PIN'i güncelle"}
      </button>
    </form>
  );
}

function OverviewSection({
  businessName,
  orders,
  publicMenuHref,
  reportDayConfig,
}: {
  businessName: string;
  orders: AdminOrder[];
  publicMenuHref: string;
  reportDayConfig: ReportDayConfig;
}) {
  const summary = buildOrdersReportSummary(orders, reportDayConfig);
  const todayOrders = getOrdersForRelativeReportDay(orders, 0, reportDayConfig);
  const yesterdayOrders = getOrdersForRelativeReportDay(orders, 1, reportDayConfig);
  const todaySummary = buildOrdersReportSummary(todayOrders, reportDayConfig);
  const yesterdaySummary = buildOrdersReportSummary(yesterdayOrders, reportDayConfig);
  const activeOrders = orders.filter((order) => ["new", "confirmed", "preparing"].includes(order.status)).slice(0, 6);
  const latestOrders = orders.slice(0, 5);
  const reportDayHint =
    reportDayConfig.hoursDayMode === "shift"
      ? `Bugün ve dün ${reportDayConfig.openTime} başlangıçlı iş gününe göre hesaplanır.`
      : "Bugün ve dün takvim gününe göre hesaplanır.";

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-surface-container-highest bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Admin Özeti</p>
        <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-background">{businessName}</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary">
          Bu ekran işletme sahibinin restorandaki genel durumu üst seviyede izlemesi için tasarlanır. Dashboard
          günlük operasyon içindir; admin tarafı ise biriken toplam görünüm, rapor ve uzaktan takip için ayrılır.
        </p>
        <p className="mt-2 text-xs font-medium text-secondary">{reportDayHint}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Tüm zamanlar</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{summary.orderCount}</p>
          <p className="mt-1 text-xs text-secondary">{formatTry(summary.revenueTotal)} ciro</p>
        </section>
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Bugün</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{todaySummary.orderCount}</p>
          <p className="mt-1 text-xs text-secondary">{formatTry(todaySummary.revenueTotal)} ciro</p>
        </section>
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Dün</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{yesterdaySummary.orderCount}</p>
          <p className="mt-1 text-xs text-secondary">{formatTry(yesterdaySummary.revenueTotal)} ciro</p>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Aktif sipariş</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{activeOrders.length}</p>
          <p className="mt-1 text-xs text-secondary">Yeni, onaylı, hazırlanan</p>
        </section>
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ortalama sepet</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{formatTry(summary.avgBasket)}</p>
          <p className="mt-1 text-xs text-secondary">Tüm zamanlar</p>
        </section>
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ürün çeşidi</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{summary.distinctProducts}</p>
          <p className="mt-1 text-xs text-secondary">Satılan farklı ürün</p>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-background">Anlık görünüm</h2>
              <p className="mt-1 text-sm text-secondary">Sahibin restoranda o anda olup biteni uzaktan izlemesi için.</p>
            </div>
            <a href="/admin" className="text-sm font-semibold text-primary hover:text-primary-container">
              Yenile
            </a>
          </div>
          {activeOrders.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-5 py-12 text-center text-sm text-secondary">
              Şu anda aktif sipariş görünmüyor. Sipariş akışı tamamlandıkça bu alanı daha detaylı geliştireceğiz.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {activeOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-container-high bg-surface-container-low/60 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-headline text-sm font-bold text-on-background">
                      {order.orderCode} · {order.firstName} {order.lastName}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {fulfillmentTypeLabel(order.fulfillmentType)} ·{" "}
                      {new Date(order.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-sm font-black text-on-background">{formatTry(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Hızlı bakış</h2>
          <div className="mt-4 space-y-3">
            <a
              href="/dashboard"
              className="block rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
            >
              Dashboard ekranına geç
            </a>
            <a
              href={publicMenuHref}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
            >
              QR menüyü yeni sekmede aç
            </a>
          </div>
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Son siparişler</h3>
            {latestOrders.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">Henüz sipariş yok.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {latestOrders.map((order) => (
                  <li key={`${order.id}-latest`} className="rounded-xl border border-surface-container-high bg-surface-container-low/60 px-4 py-3">
                    <p className="text-sm font-medium text-on-background">
                      {order.orderCode} · {order.firstName} {order.lastName}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {STATUS_LABELS[order.status]} · {formatTry(order.total)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Ödeme özeti</h2>
          <p className="mt-1 text-xs text-secondary">Tüm zamanlara göre dağılım</p>
          {summary.byPayment.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Henüz ödeme verisi yok.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {summary.byPayment.map((row) => (
                <li
                  key={row.method}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-container-high bg-surface-container-low/60 px-4 py-3"
                >
                  <span className="text-sm font-medium text-on-background">{paymentMethodLabel(row.method)}</span>
                  <span className="text-sm text-secondary">
                    {row.orderCount} sipariş · <span className="font-semibold text-on-background">{formatTry(row.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Öne çıkan ürünler</h2>
          <p className="mt-1 text-xs text-secondary">Ciroya göre ilk 5 ürün</p>
          {summary.topByRevenue.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Ürün satışı bulunmuyor.</p>
          ) : (
            <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-secondary">
              {summary.topByRevenue.slice(0, 5).map((row) => (
                <li key={`${row.key}-overview`} className="text-sm text-on-background">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-secondary"> — {formatTry(row.revenue)} · {row.qty} ad</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function LogsSection({ logs }: { logs: ActivityLogRow[] }) {
  const [actionFilter, setActionFilter] = useState<string>("all");

  const actions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return ["all", ...Array.from(set).sort()];
  }, [logs]);

  const filtered = useMemo(
    () => (actionFilter === "all" ? logs : logs.filter((l) => l.action === actionFilter)),
    [logs, actionFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">Loglar</h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          Garson, kasa, dashboard ve admin panelindeki operasyon kayıtları. Son {logs.length} kayıt gösterilir.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setActionFilter(action)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              actionFilter === action
                ? "bg-primary text-on-primary"
                : "border border-surface-container-highest bg-white text-secondary",
            ].join(" ")}
          >
            {action === "all" ? "Tümü" : ACTIVITY_ACTION_LABELS[action] ?? action}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center text-sm text-secondary">
          Henüz operasyon logu yok.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((log) => (
            <li
              key={log.id}
              className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-on-background">
                    {ACTIVITY_ACTION_LABELS[log.action] ?? log.action}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">{formatActivityLogSummary(log)}</p>
                </div>
                <time className="text-xs text-secondary">
                  {new Date(log.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                </time>
              </div>
              <p className="mt-2 text-xs text-secondary">
                {ACTIVITY_ACTOR_LABELS[log.actor_type] ?? log.actor_type}
                {log.actor_label ? ` · ${log.actor_label}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OwnerAdminPanel({
  tenantId,
  businessName,
  subdomain,
  logoUrl,
  ownerName,
  hoursDayMode,
  openTime,
  closeTime,
  plan = "free",
  trialEndsAt = null,
  initialOrders,
  initialLogs,
}: {
  tenantId: string;
  businessName: string;
  subdomain: string;
  logoUrl: string | null;
  ownerName: string;
  hoursDayMode: BusinessHoursDayMode;
  openTime: string;
  closeTime: string;
  plan?: "free" | "premium" | "lifetime";
  trialEndsAt?: string | null;
  initialOrders: AdminOrder[];
  initialLogs: ActivityLogRow[];
}) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<AdminNavId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | FulfillmentType>("all");
  const [ordersDayOffset, setOrdersDayOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(initialOrders[0]?.id ?? null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publicMenuHref = getPrimaryPublicMenuUrl(subdomain);
  const ownerBadge = ownerInitials(ownerName);
  const reportDayConfig = useMemo(
    () => ({ hoursDayMode, openTime, closeTime }),
    [hoursDayMode, openTime, closeTime],
  );

  useTenantOpsRealtime({
    tenantId,
    actions: [
      "order_created",
      "bill_requested",
      "payment_closed",
      "order_cancelled",
      "order_status_updated",
      "delivery_completed",
      "delivery_status_updated",
    ],
    onEvent: () => {
      router.refresh();
    },
  });

  const filteredByPeriod = useMemo(
    () => filterOrdersByPeriod(initialOrders, period, new Date(), reportDayConfig),
    [initialOrders, period, reportDayConfig],
  );

  const dayStrip = useMemo(() => buildReportDayStrip(7, reportDayConfig), [reportDayConfig]);
  const dayModeHint = reportDayModeLabel(reportDayConfig);

  const openOrdersLive = useMemo(
    () => initialOrders.filter((order) => ["new", "confirmed", "preparing"].includes(order.status)),
    [initialOrders],
  );
  const closedOrdersForDay = useMemo(
    () =>
      filterOrdersByPaidReportDay(
        initialOrders.filter((order) => order.status === "completed"),
        ordersDayOffset,
        reportDayConfig,
      ),
    [initialOrders, ordersDayOffset, reportDayConfig],
  );

  const ordersTabPool = useMemo(() => {
    const closedIds = new Set(closedOrdersForDay.map((o) => o.id));
    const openPart = openOrdersLive;
    const closedPart = closedOrdersForDay;
    const cancelledSameDay = filterOrdersByPaidReportDay(
      initialOrders.filter((o) => o.status === "cancelled"),
      ordersDayOffset,
      reportDayConfig,
    ).filter((o) => !closedIds.has(o.id));
    return [...openPart, ...closedPart, ...cancelledSameDay];
  }, [openOrdersLive, closedOrdersForDay, initialOrders, ordersDayOffset, reportDayConfig]);

  const filteredOrders = useMemo(() => {
    let list = ordersTabPool;
    if (channelFilter !== "all") list = list.filter((order) => order.fulfillmentType === channelFilter);
    if (statusFilter !== "all") list = list.filter((order) => order.status === statusFilter);
    return list;
  }, [ordersTabPool, channelFilter, statusFilter]);

  const ordersDaySummary = useMemo(() => {
    const completed = closedOrdersForDay;
    return {
      channel: buildChannelRevenueSummary(completed),
      payment: buildOrdersReportSummary(completed, reportDayConfig).byPayment,
      openCount: openOrdersLive.length,
      closedCount: completed.length,
    };
  }, [closedOrdersForDay, openOrdersLive.length, reportDayConfig]);

  const summary = useMemo(
    () => buildOrdersReportSummary(filteredByPeriod, reportDayConfig),
    [filteredByPeriod, reportDayConfig],
  );
  const maxDayRevenue = useMemo(
    () => summary.byDay.reduce((max, row) => Math.max(max, row.revenue), 0),
    [summary.byDay],
  );

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  function cancelOrder(orderId: string) {
    setCancelOrderId(orderId);
  }

  function confirmCancelOrder(reason: OrderCancelReason, note: string) {
    if (!cancelOrderId) return;
    const orderId = cancelOrderId;
    startTransition(async () => {
      setStatusError(null);
      const result = await cancelAdminOrderAction(orderId, reason, note);
      if (result.error) {
        setStatusError(result.error);
        return;
      }
      setCancelOrderId(null);
      router.refresh();
    });
  }

  const channelSummary = useMemo(() => buildChannelRevenueSummary(filteredByPeriod), [filteredByPeriod]);

  const headerTitle = getNavLabel(activeNav);
  const headerSubtitle =
    activeNav === "overview"
      ? "İşletmenin genel görünümü ve birikimli özet"
      : activeNav === "orders"
        ? "Aktif ve geçmiş sipariş akışı"
        : activeNav === "reports"
          ? "Dönemsel analiz, ciro ve ürün performansı"
          : activeNav === "logs"
            ? "Operasyon geçmişi ve denetim kayıtları"
            : "PIN güvenliği ve yönetici kısayolları";

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-on-background/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={[ "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-surface-container-highest bg-surface-container-lowest pt-4 transition-transform duration-300 sm:pt-5 lg:translate-x-0 lg:pt-6", sidebarOpen ? "translate-x-0" : "-translate-x-full", ].join(" ")}>
        <div className="flex items-center justify-between gap-2 border-b border-surface-container-highest px-4 pb-4 pt-1 lg:hidden">
          <AdminSidebarBrand businessName={businessName} subdomain={subdomain} logoUrl={logoUrl} />
          <button
            type="button"
            className="rounded-lg p-2 text-secondary hover:bg-surface-container-low"
            aria-label="Menüyü kapat"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="hidden border-b border-surface-container-highest px-4 pb-5 pt-1 lg:block">
          <AdminSidebarBrand businessName={businessName} subdomain={subdomain} logoUrl={logoUrl} />
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-5" aria-label="Admin menüsü">
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
            {NAV_MAIN.map((item) => (
              <SidebarNavButton
                key={item.id}
                item={item}
                active={activeNav === item.id}
                onSelect={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </div>

          <div className="mt-auto space-y-1.5 border-t border-surface-container-high pt-4">
            <SidebarNavButton
              item={NAV_SETTINGS}
              active={activeNav === NAV_SETTINGS.id}
              onSelect={() => {
                setActiveNav(NAV_SETTINGS.id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </nav>

        <div className="border-t border-surface-container-high px-3 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-secondary">Kısayollar</p>
          <div className="space-y-2">
            <a
              href="/dashboard"
              className="block rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low"
            >
              Dashboard
            </a>
            <a
              href={publicMenuHref}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low"
            >
              QR Menü
            </a>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <TenantTrialBanner tenant={{ plan, trialEndsAt }} />
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-container-highest bg-surface-container-lowest/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-on-background hover:bg-surface-container-low lg:hidden"
            aria-label="Menüyü aç"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-[26px]">menu</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="font-headline text-sm font-bold text-on-background sm:text-base">{headerTitle}</p>
            <p className="truncate text-xs text-secondary">{headerSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-2xl border border-surface-container-highest bg-white px-3 py-2 text-right shadow-sm sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Alt alan adı</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-on-background">{subdomain}</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
              title={ownerName}
            >
              {ownerBadge}
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeNav === "overview" ? (
              <OverviewSection
                businessName={businessName}
                orders={initialOrders}
                publicMenuHref={publicMenuHref}
                reportDayConfig={reportDayConfig}
              />
            ) : null}

            {activeNav === "reports" ? (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
                      Raporlar
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-secondary">
                      Buradaki filtreler bugün, dün ve tüm zaman gibi dönemsel okumaların temeli olacak. Şimdilik
                      seçilen aralığa göre özet, ciro ve ürün performansını gösterir.
                    </p>
                  </div>
                  <div
                    className="inline-flex rounded-xl border border-surface-container-highest bg-surface-container-low p-1"
                    role="group"
                    aria-label="Dönem"
                  >
                    {PERIODS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPeriod(item.id)}
                        className={[
                          "rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                          period === item.id
                            ? "bg-primary text-white shadow-sm"
                            : "text-secondary hover:bg-white hover:text-on-background",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Toplam sipariş</p>
                    <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{summary.orderCount}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ciro</p>
                    <p className="mt-2 font-headline text-3xl font-extrabold text-primary">{formatTry(summary.revenueTotal)}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ortalama sepet</p>
                    <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{formatTry(summary.avgBasket)}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ürün çeşidi</p>
                    <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{summary.distinctProducts}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Gel-al ciro</p>
                    <p className="mt-2 font-headline text-2xl font-extrabold text-on-background">
                      {formatTry(channelSummary.pickup.revenue)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">{channelSummary.pickup.count} sipariş</p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Paket ciro</p>
                    <p className="mt-2 font-headline text-2xl font-extrabold text-on-background">
                      {formatTry(channelSummary.delivery.revenue)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">{channelSummary.delivery.count} sipariş</p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Masa ciro</p>
                    <p className="mt-2 font-headline text-2xl font-extrabold text-on-background">
                      {formatTry(channelSummary.dine_in.revenue)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">{channelSummary.dine_in.count} sipariş</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                    <h2 className="font-headline text-lg font-bold text-on-background">Ödeme yöntemi dağılımı</h2>
                    <p className="mt-1 text-xs text-secondary">Merkezi sipariş verisine göre</p>
                    {summary.byPayment.length === 0 ? (
                      <p className="mt-6 text-sm text-secondary">Bu aralıkta veri yok.</p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {summary.byPayment.map((row) => (
                          <li
                            key={row.method}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-container-high bg-surface-container-low/60 px-4 py-3"
                          >
                            <span className="text-sm font-medium text-on-background">
                              {paymentMethodLabel(row.method)}
                            </span>
                            <span className="text-sm text-secondary">
                              {row.orderCount} sipariş ·{" "}
                              <span className="font-semibold text-on-background">{formatTry(row.revenue)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                    <h2 className="font-headline text-lg font-bold text-on-background">Günlük ciro</h2>
                    <p className="mt-1 text-xs text-secondary">Yerel / iş gününe göre ({reportDayModeLabel(reportDayConfig)})</p>
                    {summary.byDay.length === 0 ? (
                      <p className="mt-6 text-sm text-secondary">Bu aralıkta gün kaydı yok.</p>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {summary.byDay.map((row) => {
                          const pct = maxDayRevenue > 0 ? Math.min(100, (row.revenue / maxDayRevenue) * 100) : 0;
                          return (
                            <div key={row.dayKey} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 text-xs font-medium text-secondary sm:w-32">{row.label}</span>
                              <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-container-high">
                                <div
                                  className="h-full min-w-0 rounded-lg bg-gradient-to-r from-primary/80 to-primary-container/90"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="w-24 shrink-0 text-right text-xs">
                                <span className="font-semibold text-on-background">{formatTry(row.revenue)}</span>
                                <span className="ml-1 text-secondary">({row.orderCount})</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                    <h2 className="font-headline text-lg font-bold text-on-background">En çok satan ürünler</h2>
                    <p className="mt-1 text-xs text-secondary">İlk 10 adet sıralaması</p>
                    {summary.topByQty.length === 0 ? (
                      <p className="mt-6 text-sm text-secondary">Satış satırı yok.</p>
                    ) : (
                      <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-secondary">
                        {summary.topByQty.map((row) => (
                          <li key={row.key} className="text-sm text-on-background">
                            <span className="font-medium">{row.name}</span>
                            <span className="text-secondary"> — {row.qty} ad · {formatTry(row.revenue)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                    <h2 className="font-headline text-lg font-bold text-on-background">Ciroya göre ürünler</h2>
                    <p className="mt-1 text-xs text-secondary">İlk 10 satır toplamı</p>
                    {summary.topByRevenue.length === 0 ? (
                      <p className="mt-6 text-sm text-secondary">Satış satırı yok.</p>
                    ) : (
                      <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-secondary">
                        {summary.topByRevenue.map((row) => (
                          <li key={`${row.key}-rev`} className="text-sm text-on-background">
                            <span className="font-medium">{row.name}</span>
                            <span className="text-secondary"> — {formatTry(row.revenue)} · {row.qty} ad</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              </div>
            ) : null}

            {activeNav === "orders" ? (
              <div className="space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
                      Siparişler
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-secondary">
                      Açık siparişler anlık; kapananlar seçili iş gününe göre. Canlı yenilenir (bildirim yok). Gün
                      bölümü: {dayModeHint}.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dayStrip.map((day) => {
                    const active = day.offsetDays === ordersDayOffset;
                    return (
                      <button
                        key={day.dayKey}
                        type="button"
                        onClick={() => setOrdersDayOffset(day.offsetDays)}
                        className={[
                          "shrink-0 rounded-xl border px-3 py-2 text-left transition",
                          active
                            ? "border-on-background bg-on-background text-white"
                            : "border-surface-container-highest bg-surface-container-lowest text-secondary hover:border-primary/40",
                        ].join(" ")}
                      >
                        <span className="block text-xs font-bold">{day.shortLabel}</span>
                        <span className={["mt-0.5 block text-[10px]", active ? "text-white/70" : ""].join(" ")}>
                          {day.label.replace(/^Bugün · |^Dün · /, "")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Açık</p>
                    <p className="mt-1 font-headline text-2xl font-extrabold text-on-background">
                      {ordersDaySummary.openCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Kapanan (gün)</p>
                    <p className="mt-1 font-headline text-2xl font-extrabold text-on-background">
                      {ordersDaySummary.closedCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Gel-al</p>
                    <p className="mt-1 font-headline text-xl font-extrabold text-on-background">
                      {formatTry(ordersDaySummary.channel.pickup.revenue)}
                    </p>
                    <p className="text-xs text-secondary">{ordersDaySummary.channel.pickup.count} sipariş</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Masa</p>
                    <p className="mt-1 font-headline text-xl font-extrabold text-on-background">
                      {formatTry(ordersDaySummary.channel.dine_in.revenue)}
                    </p>
                    <p className="text-xs text-secondary">{ordersDaySummary.channel.dine_in.count} sipariş</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Paket</p>
                    <p className="mt-1 font-headline text-xl font-extrabold text-on-background">
                      {formatTry(ordersDaySummary.channel.delivery.revenue)}
                    </p>
                    <p className="text-xs text-secondary">{ordersDaySummary.channel.delivery.count} sipariş</p>
                  </div>
                  {ordersDaySummary.payment.map((row) => (
                    <div
                      key={row.method}
                      className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        {paymentMethodLabel(row.method)}
                      </p>
                      <p className="mt-1 font-headline text-xl font-extrabold text-on-background">
                        {formatTry(row.revenue)}
                      </p>
                      <p className="text-xs text-secondary">{row.orderCount} sipariş</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div
                    className="inline-flex flex-wrap rounded-xl border border-surface-container-highest bg-surface-container-low p-1"
                    role="group"
                    aria-label="Kanal filtresi"
                  >
                    {CHANNEL_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setChannelFilter(item.id)}
                        className={[
                          "rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                          channelFilter === item.id
                            ? "bg-primary text-white shadow-sm"
                            : "text-secondary hover:bg-white hover:text-on-background",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="inline-flex flex-wrap rounded-xl border border-surface-container-highest bg-surface-container-low p-1"
                    role="group"
                    aria-label="Durum filtresi"
                  >
                    {STATUS_FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStatusFilter(item.id)}
                        className={[
                          "rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                          statusFilter === item.id
                            ? "bg-on-background text-white shadow-sm"
                            : "text-secondary hover:bg-white hover:text-on-background",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-headline text-xl font-bold text-on-background">Sipariş listesi</h2>
                      <p className="mt-1 text-sm text-secondary">
                        Filtreye uyan {filteredOrders.length} kayıt · açıklar her zaman + seçili günün kapananları
                      </p>
                    </div>
                    {pending ? <p className="text-xs font-semibold text-primary">İşlem yapılıyor…</p> : null}
                  </div>
                  {statusError ? (
                    <p className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{statusError}</p>
                  ) : null}
                  {filteredOrders.length === 0 ? (
                    <p className="mt-6 rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center text-sm text-secondary">
                      Seçilen filtrelerde sipariş bulunamadı.
                    </p>
                  ) : (
                    <ul className="mt-6 space-y-3">
                      {filteredOrders.map((order) => {
                        const expanded = openId === order.id;
                        const payMethod = effectivePaymentMethod(order);
                        const isOpen = ["new", "confirmed", "preparing"].includes(order.status);
                        return (
                          <li
                            key={order.id}
                            className={[
                              "overflow-hidden rounded-2xl border bg-surface-container-lowest",
                              isOpen
                                ? "border-primary/25"
                                : order.fulfillmentType === "pickup"
                                  ? "border-sky-500/30"
                                  : order.fulfillmentType === "delivery"
                                    ? "border-amber-500/30"
                                    : "border-emerald-500/30",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenId(expanded ? null : order.id)}
                              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-surface-container-low/80"
                            >
                              <div className="min-w-0">
                                <p className="font-headline text-sm font-bold text-on-background">
                                  {order.orderCode} · {order.firstName} {order.lastName}
                                </p>
                                <p className="mt-1 text-xs text-secondary">
                                  {fulfillmentTypeLabel(order.fulfillmentType)}
                                  {order.fulfillmentType === "dine_in" && order.tableNumber != null
                                    ? ` ${order.tableNumber}`
                                    : ""}{" "}
                                  ·{" "}
                                  {new Date(order.createdAt).toLocaleString("tr-TR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}{" "}
                                  · {paymentMethodLabel(payMethod, order.mealCardBrandId)}
                                  {order.paymentMethodAtClose && order.status === "completed" ? " (tahsilat)" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                                  {STATUS_LABELS[order.status]}
                                </span>
                                <span className="text-sm font-black text-on-background">{formatTry(order.total)}</span>
                              </div>
                            </button>
                            {expanded ? (
                              <div className="border-t border-surface-container-high bg-surface-container-low/40 px-4 py-4">
                                {order.status !== "cancelled" && order.status !== "completed" ? (
                                  <div className="mb-4">
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() => cancelOrder(order.id)}
                                      className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-50"
                                    >
                                      Siparişi iptal et
                                    </button>
                                  </div>
                                ) : null}
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ürünler</p>
                                <ul className="mt-2 space-y-2 text-sm text-secondary">
                                  {order.lines.map((line) => (
                                    <li key={line.id} className="rounded-xl border border-surface-container-high bg-white px-3 py-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium text-on-background">
                                          {line.name} × {line.qty}
                                        </span>
                                        <span className="font-semibold text-primary">
                                          {formatTry(line.qty * line.unitPrice)}
                                        </span>
                                      </div>
                                      {line.selectedOptions.length > 0 ? (
                                        <p className="mt-1 text-xs text-secondary">
                                          {formatSelectedVariationLabels(line.selectedOptions).join(" · ")}
                                        </p>
                                      ) : null}
                                      {line.removedIngredients.length > 0 ? (
                                        <p className="mt-1 text-xs text-secondary">
                                          Çıkarılacak: {line.removedIngredients.join(", ")}
                                        </p>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Telefon</p>
                                    <p className="mt-1 text-on-background">{order.phone || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">E-posta</p>
                                    <p className="mt-1 break-all text-on-background">{order.email || "—"}</p>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Adres</p>
                                    <p className="mt-1 text-secondary">{formatAddressOneLine(order.address)}</p>
                                  </div>
                                  {order.orderNote.trim() ? (
                                    <div className="sm:col-span-2">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Sipariş notu (mutfak)
                                      </p>
                                      <div className="mt-1">
                                        <NoteWithMapLinks text={order.orderNote} />
                                      </div>
                                    </div>
                                  ) : null}
                                  {order.courierNote.trim() ? (
                                    <div className="sm:col-span-2">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                        Kurye notu
                                      </p>
                                      <div className="mt-1">
                                        <NoteWithMapLinks text={order.courierNote} />
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}

            {activeNav === "logs" ? <LogsSection logs={initialLogs} /> : null}

            {activeNav === "settings" ? (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                    <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
                      Ayarlar
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-secondary">
                      Admin alanı işletme sahibi için üst seviye takip ekranıdır. Buradaki güvenlik ve kısayollar
                      dashboard’dan ayrı düşünülür.
                    </p>
                  </section>
                  <OwnerAdminPinChangeForm />
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <h3 className="font-headline text-lg font-bold text-on-background">Hızlı erişim</h3>
                    <div className="mt-4 space-y-3">
                      <a
                        href="/dashboard"
                        className="block rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
                      >
                        Genel işletme paneline dön
                      </a>
                      <a
                        href={publicMenuHref}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low"
                      >
                        QR menüyü yeni sekmede aç
                      </a>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
                    <h3 className="font-headline text-lg font-bold text-on-background">Admin notu</h3>
                    <p className="mt-3 text-sm leading-relaxed text-secondary">
                      Bugün, dün, tüm zamanlar ve aktif sipariş görünümü birlikte genişletilecek yapı bu panelin
                      temelinde düşünülerek kurulmuştur. Sipariş sistemi netleştikçe aynı iskelet üstünden ilerlemek
                      kolay olacak.
                    </p>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
      <CancelOrderDialog
        open={cancelOrderId != null}
        pending={pending}
        onClose={() => setCancelOrderId(null)}
        onConfirm={confirmCancelOrder}
      />
    </div>
  );
}
