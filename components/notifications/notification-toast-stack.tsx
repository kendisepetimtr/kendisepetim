"use client";

import type { NotificationToast } from "@/lib/hooks/use-notification-stream";

type NotificationToastStackProps = {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
  formatTitle: (log: NotificationToast["log"]) => string;
  formatSummary: (log: NotificationToast["log"]) => string;
};

export default function NotificationToastStack({
  toasts,
  onDismiss,
  formatTitle,
  formatSummary,
}: NotificationToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map(({ id, log }) => (
        <div
          key={id}
          className="pointer-events-auto animate-in slide-in-from-right-4 rounded-xl border border-primary/20 bg-surface-container-lowest px-4 py-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-background">{formatTitle(log)}</p>
              <p className="mt-0.5 truncate text-xs text-secondary">{formatSummary(log)}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(id)}
              className="shrink-0 rounded-lg p-1 text-secondary hover:bg-surface-container-low"
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
