"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import KasaOrderModal from "@/components/kasa/kasa-order-modal";
import KasaShellHeader from "@/components/kasa/kasa-shell-header";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import { formatAddressOneLine } from "@/lib/customer-address";
import { DELIVERY_STATUS_LABELS } from "@/lib/delivery-status";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import { useTenantOpsRealtime } from "@/lib/hooks/use-tenant-ops-realtime";
import type { LocalMenuState } from "@/lib/local-menu";
import type { AdminOrder } from "@/lib/orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import type { CourierRow } from "@/lib/supabase/courier-types";
import { paymentMethodLabel, type TenantPaymentFlags } from "@/lib/tenant-payment";

const REFRESH_ON_ACTIONS = ["order_created", "payment_closed", "delivery_status_updated", "courier_assigned"];

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

type ListTab = "active" | "history";

type DeliveryOrdersClientProps = {
  businessName: string;
  subdomain: string;
  tenantId: string;
  features: KasaFeatures;
  initialOrders: AdminOrder[];
  courierById: Record<string, CourierRow>;
  menu: LocalMenuState;
  paymentFlags: TenantPaymentFlags;
  initialTab?: ListTab;
};

export default function DeliveryOrdersClient({
  businessName,
  subdomain,
  tenantId,
  features,
  initialOrders,
  courierById,
  menu,
  paymentFlags,
  initialTab = "active",
}: DeliveryOrdersClientProps) {
  const [tab, setTab] = useState<ListTab>(initialTab);
  const [orders, setOrders] = useState(initialOrders);
  const [historyOrders, setHistoryOrders] = useState<AdminOrder[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  const refreshActive = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/kasa/delivery", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; orders?: AdminOrder[]; error?: string };
      if (!res.ok || !data.ok || !data.orders) {
        setError(data.error ?? "Siparişler yüklenemedi.");
        return;
      }
      setOrders(data.orders);
    } catch {
      setError("Bağlantı hatası.");
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/kasa/delivery?scope=closed", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; orders?: AdminOrder[]; error?: string };
      if (!res.ok || !data.ok || !data.orders) {
        setError(data.error ?? "Geçmiş yüklenemedi.");
        return;
      }
      setHistoryOrders(data.orders);
      setHistoryLoaded(true);
    } catch {
      setError("Bağlantı hatası.");
    }
  }, []);

  useEffect(() => {
    if (tab !== "history") return;
    void refreshHistory();
  }, [tab, refreshHistory]);

  const { toasts, dismissToast, formatToastTitle, formatActivityLogSummary } = useNotificationStream({
    streamUrl: "/api/kasa/notifications/stream",
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: () => {
      void refreshActive();
      if (tab === "history") void refreshHistory();
    },
    crossClientPresence: { role: "kasa", scope: subdomain },
  });

  useTenantOpsRealtime({
    tenantId,
    actions: REFRESH_ON_ACTIONS,
    onEvent: () => {
      void refreshActive();
      if (tab === "history") void refreshHistory();
    },
  });

  const list = tab === "active" ? orders : historyOrders;

  return (
    <div className="min-h-screen bg-background">
      <KasaShellHeader
        businessName={businessName}
        features={features}
        active="paket"
        onBasketClick={tab === "active" ? () => setOrderOpen(true) : undefined}
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <div className="mb-5 flex gap-2 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={[
              "flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition",
              tab === "active" ? "bg-primary text-white" : "text-secondary hover:text-on-background",
            ].join(" ")}
          >
            Aktif ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={[
              "flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition",
              tab === "history" ? "bg-primary text-white" : "text-secondary hover:text-on-background",
            ].join(" ")}
          >
            Kapanan
          </button>
        </div>

        <p className="mb-5 text-sm text-secondary">
          {tab === "active"
            ? "Siparişe dokunun → kurye + gerçek ödeme yöntemini seçin → kapatın. Beyan ile tahsilat farklı olabilir."
            : "Kapanmış paket siparişleri. Kurye, tahsilat ve müşteri bilgisi burada kalır."}
        </p>

        {tab === "history" && !historyLoaded ? (
          <p className="py-12 text-center text-sm text-secondary">Geçmiş yükleniyor…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/50">
              {tab === "active" ? "delivery_dining" : "history"}
            </span>
            <p className="mt-3 text-sm text-secondary">
              {tab === "active" ? "Bekleyen paket siparişi yok." : "Henüz kapanmış paket siparişi yok."}
            </p>
            {tab === "active" ? (
              <button
                type="button"
                onClick={() => setOrderOpen(true)}
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white active:scale-95"
              >
                Yeni paket siparişi
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((order) => {
              const courier = order.courierId ? courierById[order.courierId] : null;
              const courierLabel =
                order.courierName || (courier ? courierDisplayName(courier) : null);
              const deliveryLabel =
                DELIVERY_STATUS_LABELS[order.deliveryStatus ?? "pending"] ?? "Bekliyor";
              const payLabel =
                tab === "history" && order.paymentMethodAtClose
                  ? paymentMethodLabel(order.paymentMethodAtClose, order.mealCardBrandId)
                  : paymentMethodLabel(order.paymentMethod, order.mealCardBrandId);
              return (
                <li key={order.id}>
                  <Link
                    href={
                      tab === "history"
                        ? `/kasa/paket/${order.id}?view=history`
                        : `/kasa/paket/${order.id}`
                    }
                    className="flex flex-col gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-black text-on-background">
                          {order.orderCode}
                        </span>
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-900">
                          {deliveryLabel}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-secondary">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-on-background">
                        {order.firstName} {order.lastName} · {order.phone}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-secondary">
                        {formatAddressOneLine(order.address)}
                      </p>
                      {courierLabel ? (
                        <p className="mt-1 text-xs font-medium text-primary">Kurye: {courierLabel}</p>
                      ) : tab === "active" ? (
                        <p className="mt-1 text-xs text-amber-800">Kurye atanmadı</p>
                      ) : null}
                      <p className="mt-1 text-xs text-secondary">
                        {tab === "history" ? "Tahsilat" : "Ödeme (beyan)"}: {payLabel}
                      </p>
                      {tab === "history" && order.paidAt ? (
                        <p className="mt-0.5 text-[11px] text-secondary">
                          {new Date(order.paidAt).toLocaleString("tr-TR")}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-headline text-xl font-black text-primary sm:shrink-0">
                      {formatTry(order.total)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {orderOpen ? (
        <KasaOrderModal
          open
          channel="delivery"
          title="Paket"
          businessName={businessName}
          subdomain={subdomain}
          menu={menu}
          paymentFlags={paymentFlags}
          onClose={() => setOrderOpen(false)}
          onOrderPlaced={() => void refreshActive()}
        />
      ) : null}

      <NotificationToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        formatTitle={formatToastTitle}
        formatSummary={formatActivityLogSummary}
      />
    </div>
  );
}
