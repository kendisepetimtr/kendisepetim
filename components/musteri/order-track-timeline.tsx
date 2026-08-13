"use client";

import {
  ORDER_TRACK_STAGES,
  ORDER_TRACK_STAGE_LABELS,
  stageFromDeliveryStatus,
  stageFromOrderStatus,
  stageIndex,
  type OrderTrackStage,
} from "@/lib/musteri/order-tracking";
import type { DeliveryStatus } from "@/lib/fulfillment";
import type { OrderStatus } from "@/lib/supabase/order-types";

type Props = {
  status: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  fulfillmentIsDelivery: boolean;
};

export default function OrderTrackTimeline({ status, deliveryStatus, fulfillmentIsDelivery }: Props) {
  const current: OrderTrackStage =
    stageFromDeliveryStatus(deliveryStatus) ??
    stageFromOrderStatus(status) ??
    "received";

  const stages = fulfillmentIsDelivery
    ? ORDER_TRACK_STAGES
    : (["received", "preparing", "ready"] as OrderTrackStage[]);

  const currentIdx = stageIndex(current);

  return (
    <ol className="mt-3 flex flex-col gap-2">
      {stages.map((stage, idx) => {
        const done = idx <= currentIdx && current !== "received" ? idx < currentIdx || true : idx <= currentIdx;
        const active = stage === current;
        return (
          <li key={stage} className="flex items-center gap-2.5">
            <span
              className={[
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                active
                  ? "bg-primary text-white"
                  : done && idx <= currentIdx
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-container-high text-secondary",
              ].join(" ")}
            >
              {idx <= currentIdx ? (
                <span className="material-symbols-outlined text-[14px]">
                  {active ? "radio_button_checked" : "check"}
                </span>
              ) : (
                idx + 1
              )}
            </span>
            <span
              className={[
                "text-xs font-semibold",
                active ? "text-primary" : idx <= currentIdx ? "text-on-background" : "text-secondary",
              ].join(" ")}
            >
              {ORDER_TRACK_STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
