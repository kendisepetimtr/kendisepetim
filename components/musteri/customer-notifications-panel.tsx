"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerOrderNotification } from "@/lib/musteri/notifications-service";
import { ORDER_TRACK_STAGE_LABELS } from "@/lib/musteri/order-tracking";
import { getOAuthSiteBase } from "@/lib/site-url";

type Props = {
  enabled: boolean;
  absoluteApi?: boolean;
};

export default function CustomerNotificationsPanel({ enabled, absoluteApi = false }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerOrderNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const apiBase = absoluteApi ? getOAuthSiteBase() : "";

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`${apiBase}/api/musteri/notifications`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: CustomerOrderNotification[];
        unread?: number;
      };
      if (res.ok && data.ok && data.items) {
        setItems(data.items);
        setUnread(data.unread ?? data.items.filter((i) => !i.readAt).length);
      }
    } catch {
      /* ignore */
    }
  }, [enabled, apiBase]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const t = window.setInterval(() => void refresh(), 12_000);
    return () => window.clearInterval(t);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      /* kullanıcı panel açınca iste */
    }
  }, [enabled]);

  async function openPanel() {
    setOpen(true);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    try {
      await fetch(`${apiBase}/api/musteri/notifications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      });
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  }

  if (!enabled) return null;

  return (
    <div className="relative z-[60]">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void openPanel())}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-surface-container-highest bg-white text-on-background shadow-sm"
        aria-label="Sipariş bildirimleri"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[22px]">chat</span>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 w-[min(100vw-2rem,340px)] overflow-hidden rounded-2xl border border-surface-container-highest bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-container-highest bg-gradient-to-br from-[#bc000c] to-[#e71418] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Sipariş asistanı</p>
              <p className="text-[11px] text-white/80">Canlı durum güncellemeleri</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/15 p-1.5"
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto bg-surface-container-low/40 p-3">
            {items.length === 0 ? (
              <p className="rounded-xl bg-white px-3 py-6 text-center text-sm text-secondary">
                Henüz bildirim yok. Sipariş verdiğinizde burada görünür.
              </p>
            ) : (
              items.map((n) => (
                <div key={n.id} className="rounded-2xl bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-primary">
                      {ORDER_TRACK_STAGE_LABELS[n.stage] ?? n.title}
                    </p>
                    <p className="text-[10px] text-secondary">
                      {n.deliveredAt
                        ? new Date(n.deliveredAt).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-on-background">{n.body}</p>
                  {n.restaurantName || n.orderCode ? (
                    <p className="mt-1 text-[11px] text-secondary">
                      {[n.restaurantName, n.orderCode].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
