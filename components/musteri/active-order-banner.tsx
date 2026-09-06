"use client";

import { useEffect, useState } from "react";
import {
  stageFromDeliveryStatus,
  stageFromOrderStatus,
  trackStageLabel,
} from "@/lib/musteri/order-tracking";
import type { MusteriOrderView } from "@/lib/musteri/orders-service";
import { customerOrderPath } from "@/lib/musteri/paths";
import { getOAuthSiteBase } from "@/lib/site-url";

type Props = {
  enabled: boolean;
  /** Restoran alt alan adından ana site API’sine. */
  absoluteApi?: boolean;
};

export default function ActiveOrderBanner({ enabled, absoluteApi = false }: Props) {
  const [order, setOrder] = useState<MusteriOrderView | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOrder(null);
      return;
    }
    const apiBase = absoluteApi ? getOAuthSiteBase() : "";
    let cancelled = false;

    function load() {
      void fetch(`${apiBase}/api/musteri/orders/active`, {
        credentials: "include",
        cache: "no-store",
      })
        .then((res) => res.json() as Promise<{ ok?: boolean; order?: MusteriOrderView | null }>)
        .then((data) => {
          if (cancelled) return;
          if (data.ok && data.order) setOrder(data.order);
          else setOrder(null);
        })
        .catch(() => {
          if (!cancelled) setOrder(null);
        });
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, absoluteApi]);

  if (!enabled || !order) return null;

  const fulfillmentIsDelivery = order.fulfillmentType === "delivery";
  const stage =
    stageFromDeliveryStatus(order.deliveryStatus) ?? stageFromOrderStatus(order.status) ?? "received";
  const href = `${getOAuthSiteBase()}${customerOrderPath(order.id)}`;

  return (
    <a
      href={href}
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm no-underline"
    >
      <span className="min-w-0">
        <span className="block font-bold text-primary">{trackStageLabel(stage, fulfillmentIsDelivery)}</span>
        <span className="mt-0.5 block truncate text-xs text-on-background">{order.restaurantName}</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-primary">Takip et →</span>
    </a>
  );
}
