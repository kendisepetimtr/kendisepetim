/** Sipariş takip aşamaları — bildirim paneli + timeline aynı motor. */

export const ORDER_TRACK_STAGES = [
  "received",
  "preparing",
  "ready",
  "on_the_way",
  "delivered",
] as const;

export type OrderTrackStage = (typeof ORDER_TRACK_STAGES)[number];

export const ORDER_TRACK_STAGE_LABELS: Record<OrderTrackStage, string> = {
  received: "Alındı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  on_the_way: "Yolda",
  delivered: "Teslim",
};

export const ORDER_TRACK_PICKUP_STAGE_LABELS: Record<OrderTrackStage, string> = {
  ...ORDER_TRACK_STAGE_LABELS,
  ready: "Gel alabilirsiniz",
};

export const ORDER_TRACK_STAGE_MESSAGES: Record<OrderTrackStage, string> = {
  received: "Siparişiniz restorana ulaştı.",
  preparing: "Siparişiniz hazırlanıyor.",
  ready: "Siparişiniz hazır.",
  on_the_way: "Siparişiniz yola çıktı.",
  delivered: "Siparişiniz teslim edildi. Afiyet olsun!",
};

export const ORDER_TRACK_PICKUP_STAGE_MESSAGES: Record<OrderTrackStage, string> = {
  ...ORDER_TRACK_STAGE_MESSAGES,
  ready: "Siparişiniz gel almaya hazır.",
};

export type OrderEtaMode = "total" | "stages";

export type OrderEtaSettings = {
  autoEnabled: boolean;
  mode: OrderEtaMode;
  totalMinutes: number;
  prepMinutes: number;
  readyMinutes: number;
  dispatchMinutes: number;
  deliverMinutes: number;
};

export const DEFAULT_ORDER_ETA: OrderEtaSettings = {
  autoEnabled: false,
  mode: "total",
  totalMinutes: 15,
  prepMinutes: 10,
  readyMinutes: 12,
  dispatchMinutes: 15,
  deliverMinutes: 30,
};

export function clampEtaMinutes(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(180, Math.max(1, Math.round(v)));
}

export function parseOrderEtaFromTenant(row: Record<string, unknown> | null | undefined): OrderEtaSettings {
  if (!row) return { ...DEFAULT_ORDER_ETA };
  const mode = row.order_eta_mode === "stages" ? "stages" : "total";
  return {
    autoEnabled: row.order_eta_auto_enabled === true,
    mode,
    totalMinutes: clampEtaMinutes(row.order_eta_total_minutes, DEFAULT_ORDER_ETA.totalMinutes),
    prepMinutes: clampEtaMinutes(row.order_eta_prep_minutes, DEFAULT_ORDER_ETA.prepMinutes),
    readyMinutes: clampEtaMinutes(row.order_eta_ready_minutes, DEFAULT_ORDER_ETA.readyMinutes),
    dispatchMinutes: clampEtaMinutes(row.order_eta_dispatch_minutes, DEFAULT_ORDER_ETA.dispatchMinutes),
    deliverMinutes: clampEtaMinutes(row.order_eta_deliver_minutes, DEFAULT_ORDER_ETA.deliverMinutes),
  };
}

/** Otomatik bildirim planı: aşama → dakika offset (sipariş anından). */
export function buildAutoNotificationPlan(
  eta: OrderEtaSettings,
  fulfillmentIsDelivery: boolean,
): { stage: OrderTrackStage; offsetMinutes: number }[] {
  if (!eta.autoEnabled) return [];

  if (eta.mode === "total") {
    return [
      { stage: "received", offsetMinutes: 0 },
      {
        stage: fulfillmentIsDelivery ? "on_the_way" : "ready",
        offsetMinutes: eta.totalMinutes,
      },
    ];
  }

  const plan: { stage: OrderTrackStage; offsetMinutes: number }[] = [
    { stage: "received", offsetMinutes: 0 },
    { stage: "preparing", offsetMinutes: Math.min(eta.prepMinutes, eta.readyMinutes) },
    { stage: "ready", offsetMinutes: eta.readyMinutes },
  ];
  if (fulfillmentIsDelivery) {
    plan.push({ stage: "on_the_way", offsetMinutes: eta.dispatchMinutes });
    plan.push({ stage: "delivered", offsetMinutes: eta.deliverMinutes });
  }
  return plan;
}

export function stageFromDeliveryStatus(status: string | null | undefined): OrderTrackStage | null {
  switch (status) {
    case "pending":
      return "received";
    case "preparing":
      return "preparing";
    case "ready_for_dispatch":
      return "ready";
    case "out_for_delivery":
      return "on_the_way";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

export function stageFromOrderStatus(status: string | null | undefined): OrderTrackStage | null {
  switch (status) {
    case "new":
    case "confirmed":
      return "received";
    case "preparing":
      return "preparing";
    case "completed":
      return "ready";
    default:
      return null;
  }
}

export function stageIndex(stage: OrderTrackStage): number {
  return ORDER_TRACK_STAGES.indexOf(stage);
}

export function trackStageLabel(
  stage: OrderTrackStage,
  fulfillmentIsDelivery: boolean,
): string {
  return fulfillmentIsDelivery ? ORDER_TRACK_STAGE_LABELS[stage] : ORDER_TRACK_PICKUP_STAGE_LABELS[stage];
}

export function trackStageMessage(
  stage: OrderTrackStage,
  fulfillmentIsDelivery: boolean,
): string {
  return fulfillmentIsDelivery
    ? ORDER_TRACK_STAGE_MESSAGES[stage]
    : ORDER_TRACK_PICKUP_STAGE_MESSAGES[stage];
}

export function listingEtaMinutesFromTenant(row: Record<string, unknown> | null | undefined): number {
  return parseOrderEtaFromTenant(row).totalMinutes;
}
