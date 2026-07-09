"use client";

import {
  ACTIVITY_ACTION_LABELS,
  formatActivityLogSummary,
} from "@/lib/dashboard/activity-log-labels";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import {
  parseNotificationSettings,
  shouldAlertForAction,
  type TenantNotificationSettings,
} from "@/lib/notification-settings";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/notification-settings";
import { playNotificationSound } from "@/lib/notification-sounds";
import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationToast = {
  id: string;
  log: ActivityLogRow;
};

type UseNotificationStreamOptions = {
  streamUrl: string;
  enabled?: boolean;
  /** Bu aksiyonlarda onRefresh çağrılır */
  refreshOnActions?: string[];
  onRefresh?: () => void;
  onActivity?: (log: ActivityLogRow) => void;
  /** true dönerse varsayılan tek seferlik ses atlanır */
  onSoundAlert?: (log: ActivityLogRow, settings: TenantNotificationSettings) => boolean | void;
};

function formatToastTitle(log: ActivityLogRow): string {
  return ACTIVITY_ACTION_LABELS[log.action] ?? log.action;
}

export function useNotificationStream({
  streamUrl,
  enabled = true,
  refreshOnActions = [],
  onRefresh,
  onActivity,
  onSoundAlert,
}: UseNotificationStreamOptions) {
  const settingsRef = useRef<TenantNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const onRefreshRef = useRef(onRefresh);
  const onActivityRef = useRef(onActivity);
  const onSoundAlertRef = useRef(onSoundAlert);
  const refreshActionsRef = useRef(refreshOnActions);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [connected, setConnected] = useState(false);

  onRefreshRef.current = onRefresh;
  onActivityRef.current = onActivity;
  onSoundAlertRef.current = onSoundAlert;
  refreshActionsRef.current = refreshOnActions;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource(streamUrl);

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    es.addEventListener("settings", (event) => {
      try {
        settingsRef.current = parseNotificationSettings(JSON.parse(event.data));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("activity", (event) => {
      let log: ActivityLogRow;
      try {
        log = JSON.parse(event.data) as ActivityLogRow;
      } catch {
        return;
      }

      const settings = settingsRef.current;
      if (shouldAlertForAction(log.action, settings)) {
        if (settings.soundEnabled) {
          const skipDefaultSound = onSoundAlertRef.current?.(log, settings) === true;
          if (!skipDefaultSound) {
            void playNotificationSound(settings.soundId);
          }
        }
        if (settings.toastEnabled) {
          setToasts((prev) => {
            const next = [...prev.filter((t) => t.id !== log.id), { id: log.id, log }];
            return next.slice(-5);
          });
          window.setTimeout(() => dismissToast(log.id), 8000);
        }
      }

      onActivityRef.current?.(log);

      if (refreshActionsRef.current.includes(log.action)) {
        onRefreshRef.current?.();
      }
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, [streamUrl, enabled, dismissToast]);

  return { toasts, dismissToast, connected, formatToastTitle, formatActivityLogSummary };
}
