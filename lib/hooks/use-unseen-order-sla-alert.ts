"use client";

import { isOrderUnseenOverdue } from "@/lib/order-sla";
import {
  startRepeatingNotificationSound,
  stopRepeatingNotificationSound,
} from "@/lib/notification-sounds";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/notification-settings";
import type { AdminOrder } from "@/lib/orders";
import { useEffect, useRef } from "react";

/** 3 dk görülmeyen açık siparişlerde mevcut sipariş sesini tekrarlar. */
export function useUnseenOrderSlaAlert(orders: AdminOrder[], enabled = true) {
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    if (!enabled) {
      stopRepeatingNotificationSound();
      return;
    }

    function sync() {
      const overdue = ordersRef.current.some((o) =>
        isOrderUnseenOverdue({ status: o.status, createdAt: o.createdAt, seenAt: o.seenAt }),
      );
      if (overdue) {
        startRepeatingNotificationSound(DEFAULT_NOTIFICATION_SETTINGS.soundId);
      } else {
        stopRepeatingNotificationSound();
      }
    }

    sync();
    const timer = window.setInterval(sync, 15_000);
    return () => {
      window.clearInterval(timer);
      stopRepeatingNotificationSound();
    };
  }, [enabled, orders]);
}
