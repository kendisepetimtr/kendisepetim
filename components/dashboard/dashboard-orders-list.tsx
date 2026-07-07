"use client";

import { formatAddressOneLine } from "@/lib/customer-address";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import { DASHBOARD_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderChannelFilter } from "@/lib/dashboard/orders-service";
import { formatTry } from "@/lib/orders-report";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import type { OrderStatus } from "@/lib/supabase/order-types";
import { useCallback, useEffect, useState, useTransition } from "react";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import { useDashboardReceiptPrint } from "@/lib/hooks/use-receipt-print";

const REFRESH_ON_ACTIONS = [
  "order_created",
  "bill_requested",
  "payment_closed",
  "order_status_updated",
  "delivery_status_updated",
  "courier_assigned",
];

const CHANNEL_TABS: { id: OrderChannelFilter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "pickup", label: "Gel-Al" },
  { id: "delivery", label: "Paket" },
  { id: "dine_in", label: "Masa" },
];

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
                  className="font-semibold text-primary underline decoration-primary/40 underline-offset-2"
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

type DashboardOrdersListProps = {
  remoteAuthEnabled?: boolean;
  businessName?: string;
};

export default function DashboardOrdersList({
  remoteAuthEnabled = false,
  businessName = "",
}: DashboardOrdersListProps) {
  const [channel, setChannel] = useState<OrderChannelFilter>("all");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!remoteAuthEnabled) {
      setOrders([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/orders?channel=${encodeURIComponent(channel)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; orders?: AdminOrder[]; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Siparişler yüklenemedi.");
        setOrders([]);
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError("Siparişler yüklenemedi.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [channel, remoteAuthEnabled]);

  const { toasts, dismissToast, formatToastTitle, formatActivityLogSummary } = useNotificationStream({
    streamUrl: "/api/dashboard/notifications/stream",
    enabled: remoteAuthEnabled,
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: load,
  });

  const { printOrder } = useDashboardReceiptPrint(businessName);

  useEffect(() => {
    void load();
  }, [load]);

  function handleStatusChange(orderId: string, status: OrderStatus) {
    startTransition(async () => {
      const res = await fetch("/api/dashboard/orders", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Güncellenemedi.");
        return;
      }
      await load();
    });
  }

  if (!remoteAuthEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center">
        <p className="text-sm text-secondary">Canlı siparişler için Supabase oturumu gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CHANNEL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannel(tab.id)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                channel === tab.id
                  ? "bg-primary text-on-primary"
                  : "border border-surface-container-highest bg-white text-secondary hover:text-on-background",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || pending}
          className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Yenile
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}

      {loading ? (
        <div className="py-16 text-center text-sm text-secondary">Siparişler yükleniyor…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-secondary/40">receipt_long</span>
          <p className="mt-4 font-headline text-lg font-bold text-on-background">Henüz sipariş yok</p>
          <p className="mt-2 text-sm text-secondary">
            QR menü, marketplace veya personel panellerinden gelen siparişler burada listelenir.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const expanded = openId === o.id;
            const canUpdate = o.status !== "completed" && o.status !== "cancelled";
            return (
              <li
                key={o.id}
                className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : o.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-surface-container-low/80"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-bold text-primary">{o.orderCode}</p>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                        {fulfillmentTypeLabel(o.fulfillmentType)}
                      </span>
                      {o.tableNumber ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Masa {o.tableNumber}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-headline text-sm font-bold text-on-background">
                      {o.firstName} {o.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      {new Date(o.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                      {ORDER_STATUS_LABELS[o.status]} · {formatTry(o.total)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-secondary">
                    {expanded ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-surface-container-high bg-surface-container-low/40 px-4 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void printOrder(o)}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        <span className="material-symbols-outlined text-[14px]">print</span>
                        Fiş yazdır
                      </button>
                      {canUpdate
                        ? DASHBOARD_ORDER_STATUSES.filter((s) => s !== o.status).map((status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={pending}
                              onClick={() => handleStatusChange(o.id, status)}
                              className={[
                                "rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-50",
                                status === "cancelled"
                                  ? "border border-error/30 text-error hover:bg-error/5"
                                  : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
                              ].join(" ")}
                            >
                              {ORDER_STATUS_LABELS[status]}
                            </button>
                          ))
                        : null}
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Ürünler</p>
                    <ul className="mt-2 space-y-1 text-secondary">
                      {o.lines.map((l) => (
                        <li key={l.id}>
                          {l.name} × {l.qty} — {formatTry(l.unitPrice * l.qty)}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Ödeme</p>
                    <p className="mt-1 text-on-background">
                      {paymentMethodLabel(o.paymentMethod, o.mealCardBrandId)}
                      {o.paymentMethodAtClose && o.paymentMethodAtClose !== o.paymentMethod
                        ? ` → kapanış: ${paymentMethodLabel(o.paymentMethodAtClose, o.mealCardBrandId)}`
                        : null}
                    </p>

                    {o.fulfillmentType === "delivery" ? (
                      <>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Adres</p>
                        <p className="mt-1 text-secondary">{formatAddressOneLine(o.address) || "—"}</p>
                      </>
                    ) : null}

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Telefon</p>
                    <p className="mt-1 text-on-background">{o.phone || "—"}</p>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Not</p>
                    <div className="mt-1">
                      <NoteWithMapLinks text={o.orderNote} />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <NotificationToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        formatTitle={formatToastTitle}
        formatSummary={formatActivityLogSummary}
      />
    </div>
  );
}
