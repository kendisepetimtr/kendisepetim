"use client";

import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTOR_LABELS,
  formatActivityLogSummary,
} from "@/lib/dashboard/activity-log-labels";
import type { NotificationToast } from "@/lib/hooks/use-notification-stream";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type DashboardNotificationsBellProps = {
  enabled: boolean;
  connected: boolean;
  toasts: NotificationToast[];
  dismissToast: (id: string) => void;
  formatToastTitle: (log: ActivityLogRow) => string;
  formatActivityLogSummary: (log: ActivityLogRow) => string;
  activityLogs: ActivityLogRow[];
  setActivityLogs: Dispatch<SetStateAction<ActivityLogRow[]>>;
};

export default function DashboardNotificationsBell({
  enabled,
  connected,
  toasts,
  dismissToast,
  formatToastTitle,
  formatActivityLogSummary: fmtSummary,
  activityLogs,
  setActivityLogs,
}: DashboardNotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/activity-logs", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; logs?: ActivityLogRow[] };
      if (res.ok && data.ok && data.logs) {
        setActivityLogs(data.logs.slice(0, 30));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [enabled, setActivityLogs]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!enabled) return null;

  const statusHint = connected ? "Canlı" : "Bağlanıyor…";

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void loadLogs();
          }}
          className="relative hidden rounded-xl p-2 text-secondary hover:bg-surface-container-low sm:inline-flex"
          aria-label="Bildirimler"
          aria-expanded={open}
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {connected ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" title={statusHint} />
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
              <p className="text-sm font-bold text-on-background">Son aktiviteler</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{statusHint}</span>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {loading && activityLogs.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-secondary">Yükleniyor…</li>
              ) : activityLogs.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-secondary">Henüz aktivite yok.</li>
              ) : (
                activityLogs.map((log) => (
                  <li
                    key={log.id}
                    className="border-b border-surface-container-highest/60 px-4 py-2.5 last:border-0"
                  >
                    <p className="text-xs font-semibold text-on-background">
                      {ACTIVITY_ACTION_LABELS[log.action] ?? log.action}
                    </p>
                    <p className="mt-0.5 text-[11px] text-secondary">{formatActivityLogSummary(log)}</p>
                    <p className="mt-1 text-[10px] text-secondary/80">
                      {ACTIVITY_ACTOR_LABELS[log.actor_type] ?? log.actor_type} · {formatTime(log.created_at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>

      <NotificationToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        formatTitle={formatToastTitle}
        formatSummary={fmtSummary}
      />
    </>
  );
}
