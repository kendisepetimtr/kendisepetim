"use client";

import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import {
  startRepeatingNotificationSound,
  stopRepeatingNotificationSound,
} from "@/lib/notification-sounds";
import type { TenantNotificationSettings } from "@/lib/notification-settings";
import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_ON_ACTIONS = [
  "order_created",
  "bill_requested",
  "payment_closed",
  "order_status_updated",
  "delivery_status_updated",
  "courier_assigned",
];

const PERSISTENT_ALERT_ACTIONS = new Set(["order_created", "bill_requested"]);

type UseDashboardOrderNotificationsOptions = {
  enabled: boolean;
  ordersTabActive: boolean;
  onOrderCreated?: (log: ActivityLogRow) => void;
};

export function useDashboardOrderNotifications({
  enabled,
  ordersTabActive,
  onOrderCreated,
}: UseDashboardOrderNotificationsOptions) {
  const [pendingOrderAlert, setPendingOrderAlert] = useState(false);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const ordersTabActiveRef = useRef(ordersTabActive);
  const onOrderCreatedRef = useRef(onOrderCreated);

  ordersTabActiveRef.current = ordersTabActive;
  onOrderCreatedRef.current = onOrderCreated;

  const bumpOrdersRefresh = useCallback(() => {
    setOrdersRefreshKey((key) => key + 1);
  }, []);

  const handleSoundAlert = useCallback((log: ActivityLogRow, settings: TenantNotificationSettings) => {
    if (!PERSISTENT_ALERT_ACTIONS.has(log.action)) return false;
    if (ordersTabActiveRef.current) return false;

    setPendingOrderAlert(true);
    startRepeatingNotificationSound(settings.soundId);
    return true;
  }, []);

  const handleActivity = useCallback((log: ActivityLogRow) => {
    setActivityLogs((prev) => {
      if (prev.some((entry) => entry.id === log.id)) return prev;
      return [log, ...prev].slice(0, 30);
    });
    if (log.action === "order_created") {
      onOrderCreatedRef.current?.(log);
    }
    if (PERSISTENT_ALERT_ACTIONS.has(log.action) && !ordersTabActiveRef.current) {
      setPendingOrderAlert(true);
    }
  }, []);

  const stream = useNotificationStream({
    streamUrl: "/api/dashboard/notifications/stream",
    enabled,
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: bumpOrdersRefresh,
    onActivity: handleActivity,
    onSoundAlert: handleSoundAlert,
  });

  useEffect(() => {
    if (!ordersTabActive) return;
    setPendingOrderAlert(false);
    stopRepeatingNotificationSound();
  }, [ordersTabActive]);

  useEffect(() => {
    return () => stopRepeatingNotificationSound();
  }, []);

  return {
    ...stream,
    pendingOrderAlert,
    ordersRefreshKey,
    activityLogs,
    setActivityLogs,
  };
}
