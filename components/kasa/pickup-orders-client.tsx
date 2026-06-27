"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import KasaShellHeader from "@/components/kasa/kasa-shell-header";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";
import type { AdminOrder } from "@/lib/orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { paymentMethodLabel } from "@/lib/tenant-payment";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

const STATUS_CHIP: Record<string, string> = {
  new: "bg-sky-500/15 text-sky-900",
  confirmed: "bg-violet-500/15 text-violet-900",
  preparing: "bg-amber-500/15 text-amber-900 animate-pulse",
};

type PickupOrdersClientProps = {
  businessName: string;
  features: KasaFeatures;
  initialOrders: AdminOrder[];
};

export default function PickupOrdersClient({
  businessName,
  features,
  initialOrders,
}: PickupOrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kasa/pickup", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; orders?: AdminOrder[]; error?: string };
      if (!res.ok || !data.ok || !data.orders) {
        setError(data.error ?? "Siparişler yüklenemedi.");
        return;
      }
      setOrders(data.orders);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background">
      <KasaShellHeader
        businessName={businessName}
        features={features}
        active="gel-al"
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <p className="mb-5 text-sm text-secondary">
          Online gel-al siparişleri. Müşteri geldiğinde siparişe dokunun, ödemeyi alın ve teslim edin.
        </p>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/50">shopping_bag</span>
            <p className="mt-3 text-sm text-secondary">Bekleyen gel-al siparişi yok.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/kasa/gel-al/${order.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-black text-on-background">{order.orderCode}</span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          STATUS_CHIP[order.status] ?? "bg-surface-container-high text-secondary",
                        ].join(" ")}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-background">
                      {order.firstName} {order.lastName}
                    </p>
                    <p className="text-xs text-secondary">
                      {order.phone} · {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Ödeme (beyan): {paymentMethodLabel(order.paymentMethod, order.mealCardBrandId)}
                    </p>
                  </div>
                  <p className="font-headline text-xl font-black text-primary sm:shrink-0">
                    {formatTry(order.total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
