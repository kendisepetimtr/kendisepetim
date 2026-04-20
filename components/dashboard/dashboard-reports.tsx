"use client";

import {
  buildOrdersReportSummary,
  filterOrdersByPeriod,
  formatTry,
  type ReportPeriod,
} from "@/lib/local-orders-report";
import { getLocalOrders, type LocalOrder } from "@/lib/local-orders";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardReportsProps = {
  subdomain: string;
};

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "7d", label: "Son 7 gün" },
  { id: "30d", label: "Son 30 gün" },
  { id: "all", label: "Tümü" },
];

export default function DashboardReports({ subdomain }: DashboardReportsProps) {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>("7d");

  const load = useCallback(() => {
    setOrders(getLocalOrders(subdomain).orders);
  }, [subdomain]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const filtered = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const summary = useMemo(() => buildOrdersReportSummary(filtered), [filtered]);
  const maxDayRevenue = useMemo(
    () => summary.byDay.reduce((m, d) => Math.max(m, d.revenue), 0),
    [summary.byDay],
  );

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-secondary/40">bar_chart</span>
        <p className="mt-4 font-headline text-lg font-bold text-on-background">Rapor için veri yok</p>
        <p className="mt-2 text-sm text-secondary">
          QR menüden gelen siparişler bu cihazda birikince burada özetlenir. Siparişler sekmesinden de
          kontrol edebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-secondary">
          Özetler bu tarayıcıda saklanan QR siparişlerine göre hesaplanır. Canlı ortamda tüm kanallar tek
          raporda birleşecek.
        </p>
        <div
          className="inline-flex rounded-xl border border-surface-container-highest bg-surface-container-low p-1"
          role="group"
          aria-label="Dönem"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={[
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                period === p.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-secondary hover:bg-white/80 hover:text-on-background",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-on-background">
          Seçilen dönemde sipariş yok. &quot;Tümü&quot; veya daha uzun aralığı deneyin.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Sipariş adedi</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">{summary.orderCount}</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ciro (tutar)</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-primary">{formatTry(summary.revenueTotal)}</p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ortalama sepet</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">
            {formatTry(summary.avgBasket)}
          </p>
        </div>
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Ürün çeşidi</p>
          <p className="mt-2 font-headline text-3xl font-extrabold text-on-background">
            {summary.distinctProducts}
          </p>
          <p className="mt-1 text-xs text-secondary">farklı kalem (satır)</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Ödeme yöntemi dağılımı</h2>
          <p className="mt-1 text-xs text-secondary">Sipariş adedi ve ciro (sipariş toplamına göre)</p>
          {summary.byPayment.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Veri yok.</p>
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
                    {row.orderCount} sipariş · <span className="font-semibold text-on-background">{formatTry(row.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Günlük ciro</h2>
          <p className="mt-1 text-xs text-secondary">Yerel takvim gününe göre</p>
          {summary.byDay.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Bu aralıkta gün kaydı yok.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {summary.byDay.map((d) => {
                const pct = maxDayRevenue > 0 ? Math.min(100, (d.revenue / maxDayRevenue) * 100) : 0;
                return (
                  <div key={d.dayKey} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-secondary sm:w-32">{d.label}</span>
                    <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-container-high">
                      <div
                        className="h-full min-w-0 rounded-lg bg-gradient-to-r from-primary/80 to-primary-container/90 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right text-xs">
                      <span className="font-semibold text-on-background">{formatTry(d.revenue)}</span>
                      <span className="ml-1 text-secondary">({d.orderCount})</span>
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
          <h2 className="font-headline text-lg font-bold text-on-background">En çok satan ürünler (adet)</h2>
          <p className="mt-1 text-xs text-secondary">İlk 10</p>
          {summary.topByQty.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Satır kalemi yok.</p>
          ) : (
            <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-secondary">
              {summary.topByQty.map((r) => (
                <li key={r.key} className="text-sm text-on-background">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-secondary">
                    {" "}
                    — {r.qty} ad · {formatTry(r.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Ciroye göre ürünler</h2>
          <p className="mt-1 text-xs text-secondary">İlk 10 (satır toplamları)</p>
          {summary.topByRevenue.length === 0 ? (
            <p className="mt-6 text-sm text-secondary">Satır kalemi yok.</p>
          ) : (
            <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-secondary">
              {summary.topByRevenue.map((r) => (
                <li key={`${r.key}-rev`} className="text-sm text-on-background">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-secondary">
                    {" "}
                    — {formatTry(r.revenue)} · {r.qty} ad
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
