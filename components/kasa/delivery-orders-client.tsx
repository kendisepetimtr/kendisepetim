"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
import { paymentMethodLabel } from "@/lib/tenant-payment";

const REFRESH_ON_ACTIONS = ["order_created", "payment_closed", "delivery_status_updated", "courier_assigned"];

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

type DeliveryOrdersClientProps = {
  businessName: string;
  subdomain: string;
  tenantId: string;
  features: KasaFeatures;
  initialOrders: AdminOrder[];
  courierById: Record<string, CourierRow>;
  menu: LocalMenuState;
};

export default function DeliveryOrdersClient({
  businessName,
  subdomain,
  tenantId,
  features,
  initialOrders,
  courierById,
  menu,
}: DeliveryOrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  const refresh = useCallback(async () => {
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

  const { toasts, dismissToast, formatToastTitle, formatActivityLogSummary } = useNotificationStream({
    streamUrl: "/api/kasa/notifications/stream",
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: refresh,
  });

  useTenantOpsRealtime({
    tenantId,
    actions: REFRESH_ON_ACTIONS,
    onEvent: () => void refresh(),
  });

  return (
    <div className="min-h-screen bg-background">
      <KasaShellHeader
        businessName={businessName}
        features={features}
        active="paket"
        onBasketClick={() => setOrderOpen(true)}
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <p className="mb-5 text-sm text-secondary">
          Sepet ile yeni paket siparişi alın (müşteri + ürün modalı). Listedeki siparişe dokunarak detay / ödeme.
        </p>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/50">delivery_dining</span>
            <p className="mt-3 text-sm text-secondary">Bekleyen paket siparişi yok.</p>
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white active:scale-95"
            >
              Yeni paket siparişi
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const courier = order.courierId ? courierById[order.courierId] : null;
              const deliveryLabel =
                DELIVERY_STATUS_LABELS[order.deliveryStatus ?? "pending"] ?? "Bekliyor";
              return (
                <li key={order.id}>
                  <Link
                    href={`/kasa/paket/${order.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-lg font-black text-on-background">{order.orderCode}</span>
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
                      {courier ? (
                        <p className="mt-1 text-xs font-medium text-primary">
                          Kurye: {courierDisplayName(courier)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-amber-800">Kurye atanmadı</p>
                      )}
                      <p className="mt-1 text-xs text-secondary">
                        Ödeme (beyan): {paymentMethodLabel(order.paymentMethod, order.mealCardBrandId)}
                      </p>
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
          onClose={() => setOrderOpen(false)}
          onOrderPlaced={() => void refresh()}
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
