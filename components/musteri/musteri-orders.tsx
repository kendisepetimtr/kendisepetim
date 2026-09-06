"use client";

import Link from "next/link";
import OrderTrackTimeline from "@/components/musteri/order-track-timeline";
import type { MusteriOrderView } from "@/lib/musteri/orders-service";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { DELIVERY_STATUS_LABELS } from "@/lib/delivery-status";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { customerOrderPath, MUSTERI_HOME_PATH } from "@/lib/musteri/paths";
import { formatCancelReasonForCustomer, isOrderCancelReason } from "@/lib/order-cancel";

type Props = {
  accountOrders: MusteriOrderView[];
  isCustomer: boolean;
  restaurantNames?: Record<string, string>;
};

function money(n: number) {
  return `${Math.round(n).toLocaleString("tr-TR")} ₺`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function menuUrl(subdomain: string) {
  if (typeof window === "undefined") return `https://${subdomain}.kendisepetim.com`;
  const host = window.location.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) {
    return `http://${subdomain}.localhost:${window.location.port || "3000"}`;
  }
  return `https://${subdomain}.kendisepetim.com`;
}

function reorderHref(order: MusteriOrderView): string {
  const base = menuUrl(order.subdomain);
  const ids = order.lines.map((l) => l.productId).filter(Boolean);
  if (ids.length === 0) return base;
  return `${base}?tekrar=${encodeURIComponent(ids.join(","))}`;
}

export default function MusteriOrders({ accountOrders }: Props) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight">Siparişlerim</h1>
        <p className="mt-1 text-sm text-secondary">Durum takibi ve tekrar sipariş.</p>
      </div>

      {accountOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest px-6 py-14 text-center">
          <p className="font-headline text-lg font-bold">Henüz sipariş yok</p>
          <Link href={MUSTERI_HOME_PATH} className="mt-4 inline-flex font-bold text-primary">
            Restoran keşfet
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {accountOrders.map((o) => {
            const cancelled = o.status === "cancelled" || o.deliveryStatus === "cancelled";
            return (
            <li
              key={o.id}
              className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
            >
              <Link href={customerOrderPath(o.id)} className="block">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-headline text-base font-bold text-on-background">{o.restaurantName}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {o.orderCode} · {formatWhen(o.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-bold text-on-background">{money(o.total)}</p>
              </div>
              <p className="mt-2 text-xs font-semibold text-primary">
                {cancelled
                  ? "İptal edildi"
                  : o.deliveryStatus
                    ? DELIVERY_STATUS_LABELS[o.deliveryStatus]
                    : ORDER_STATUS_LABELS[o.status]}
                {o.fulfillmentType ? ` · ${fulfillmentTypeLabel(o.fulfillmentType)}` : ""}
              </p>
              {cancelled ? (
                <p className="mt-1 text-xs text-error">
                  {formatCancelReasonForCustomer(
                    isOrderCancelReason(o.cancelReason) ? o.cancelReason : undefined,
                    o.cancelNote,
                  )}
                </p>
              ) : (
                <OrderTrackTimeline
                  status={o.status}
                  deliveryStatus={o.deliveryStatus}
                  fulfillmentIsDelivery={o.fulfillmentType === "delivery"}
                />
              )}
              </Link>

              {o.lines.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-surface-container-highest pt-3">
                  {o.lines.map((line, idx) => (
                    <li key={`${line.productId}-${idx}`} className="flex justify-between text-xs text-secondary">
                      <span>
                        {line.qty}× {line.name}
                      </span>
                      <span>{money(line.unitPrice * line.qty)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {o.subdomain ? (
                <a
                  href={reorderHref(o)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  Siparişi tekrarla
                </a>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
