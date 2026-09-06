"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OrderTrackTimeline from "@/components/musteri/order-track-timeline";
import {
  formatCancelReasonForCustomer,
  isOrderCancelReason,
} from "@/lib/order-cancel";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { DELIVERY_STATUS_LABELS } from "@/lib/delivery-status";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import {
  stageFromDeliveryStatus,
  stageFromOrderStatus,
  trackStageMessage,
} from "@/lib/musteri/order-tracking";
import type { MusteriOrderView } from "@/lib/musteri/orders-service";
import { MUSTERI_ORDERS_PATH } from "@/lib/musteri/paths";

function money(n: number) {
  return `${Math.round(n).toLocaleString("tr-TR")} ₺`;
}

type Props = { initialOrder: MusteriOrderView };

export default function MusteriOrderTrack({ initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    if (order.status === "cancelled" || order.status === "completed") return;
    if (order.deliveryStatus === "delivered" || order.deliveryStatus === "cancelled") return;

    const timer = window.setInterval(() => {
      void fetch(`/api/musteri/orders/${encodeURIComponent(order.id)}`, {
        credentials: "include",
        cache: "no-store",
      })
        .then((res) => res.json() as Promise<{ ok?: boolean; order?: MusteriOrderView }>)
        .then((data) => {
          if (data.ok && data.order) setOrder(data.order);
        })
        .catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [order.id, order.status, order.deliveryStatus]);

  const cancelled = order.status === "cancelled" || order.deliveryStatus === "cancelled";
  const fulfillmentIsDelivery = order.fulfillmentType === "delivery";
  const currentStage =
    stageFromDeliveryStatus(order.deliveryStatus) ?? stageFromOrderStatus(order.status) ?? "received";
  const cancelText = cancelled
    ? formatCancelReasonForCustomer(
        isOrderCancelReason(order.cancelReason) ? order.cancelReason : undefined,
        order.cancelNote,
      )
    : null;

  return (
    <div>
      <Link href={MUSTERI_ORDERS_PATH} className="text-xs font-bold text-primary">
        ← Siparişlerim
      </Link>

      <div className="mt-4 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{order.restaurantName}</p>
        <h1 className="mt-1 font-headline text-2xl font-extrabold tracking-tight text-on-background">
          {order.orderCode}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {order.fulfillmentType ? fulfillmentTypeLabel(order.fulfillmentType) : ""}
          {order.etaMinutes ? ` · ~${order.etaMinutes} dk` : ""}
        </p>

        {cancelled ? (
          <div className="mt-5 rounded-xl border border-error/30 bg-error/5 px-4 py-3">
            <p className="text-sm font-bold text-error">Sipariş iptal edildi</p>
            <p className="mt-1 text-sm text-on-background">{cancelText}</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-primary">
              {trackStageMessage(currentStage, fulfillmentIsDelivery)}
            </p>
            <OrderTrackTimeline
              status={order.status}
              deliveryStatus={order.deliveryStatus}
              fulfillmentIsDelivery={fulfillmentIsDelivery}
            />
          </>
        )}

        {order.addressLine !== "—" ? (
          <p className="mt-4 text-xs text-secondary">{order.addressLine}</p>
        ) : null}

        <ul className="mt-4 space-y-1 border-t border-surface-container-highest pt-4">
          {order.lines.map((line, idx) => (
            <li key={`${line.productId}-${idx}`} className="flex justify-between text-sm text-secondary">
              <span>
                {line.qty}× {line.name}
              </span>
              <span>{money(line.unitPrice * line.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-base font-bold text-on-background">{money(order.total)}</p>
        <p className="mt-2 text-xs text-secondary">
          {order.deliveryStatus
            ? DELIVERY_STATUS_LABELS[order.deliveryStatus]
            : ORDER_STATUS_LABELS[order.status]}
        </p>
      </div>
    </div>
  );
}
