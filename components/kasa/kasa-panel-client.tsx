"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import KasaShellHeader from "@/components/kasa/kasa-shell-header";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import type { GarsonTableCell } from "@/lib/garson/tables-service";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";

const REFRESH_ON_ACTIONS = ["order_created", "bill_requested", "payment_closed"];

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

const STATUS_COPY: Record<
  GarsonTableCell["status"],
  { label: string; chip: string; card: string }
> = {
  empty: {
    label: "Boş",
    chip: "bg-surface-container-high text-secondary",
    card: "border-surface-container-highest bg-surface-container-lowest",
  },
  active: {
    label: "Dolu",
    chip: "bg-emerald-500/15 text-emerald-800",
    card: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
  },
  bill_requested: {
    label: "Hesap istendi",
    chip: "bg-amber-500/15 text-amber-900 animate-pulse",
    card: "border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/20 hover:border-amber-500/70",
  },
  closed: {
    label: "Kapalı",
    chip: "bg-surface-container-high text-secondary",
    card: "border-surface-container-highest bg-surface-container-lowest",
  },
};

type KasaPanelClientProps = {
  businessName: string;
  features: KasaFeatures;
  initialTables: GarsonTableCell[];
};

export default function KasaPanelClient({ businessName, features, initialTables }: KasaPanelClientProps) {
  const [tables, setTables] = useState(initialTables);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kasa/tables", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; tables?: GarsonTableCell[]; error?: string };
      if (!res.ok || !data.ok || !data.tables) {
        setError(data.error ?? "Masa listesi yüklenemedi.");
        return;
      }
      setTables(data.tables);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { toasts, dismissToast, formatToastTitle, formatActivityLogSummary } = useNotificationStream({
    streamUrl: "/api/kasa/notifications/stream",
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: refresh,
  });

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background">
      <KasaShellHeader
        businessName={businessName}
        features={features}
        active="masalar"
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {!features.dineIn && features.pickup ? (
          <p className="mb-4 text-sm text-secondary">
            Masa servisi kapalı.{" "}
            <Link href="/kasa/gel-al" className="font-semibold text-primary hover:underline">
              Gel-al siparişlerine git
            </Link>
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        {features.dineIn ? (
          <>
            <p className="mb-5 text-sm text-secondary">
              Dolu masalara dokunarak siparişleri görün ve ödemeyi alın. Turuncu masalar hesap istemiş demektir.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tables.map((table) => {
                const copy = STATUS_COPY[table.status] ?? STATUS_COPY.empty;
                const occupied = table.status === "active" || table.status === "bill_requested";
                const href = occupied ? `/kasa/masa/${table.tableNumber}` : undefined;

                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-headline text-2xl font-black text-on-background">{table.tableNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${copy.chip}`}>
                        {copy.label}
                      </span>
                    </div>
                    {occupied ? (
                      <div className="mt-auto pt-3 text-xs text-secondary">
                        <p>{table.orderCount} sipariş</p>
                        <p className="font-headline text-sm font-bold text-on-background">
                          {formatTry(table.sessionTotal)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-auto pt-3 text-xs text-secondary">Boş masa</p>
                    )}
                  </>
                );

                if (!href) {
                  return (
                    <div
                      key={table.tableNumber}
                      className={[
                        "flex min-h-[120px] flex-col rounded-2xl border p-4 opacity-70",
                        copy.card,
                      ].join(" ")}
                    >
                      {inner}
                    </div>
                  );
                }

                return (
                  <Link
                    key={table.tableNumber}
                    href={href}
                    className={[
                      "flex min-h-[120px] flex-col rounded-2xl border p-4 shadow-sm transition",
                      copy.card,
                    ].join(" ")}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </main>

      <NotificationToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        formatTitle={formatToastTitle}
        formatSummary={formatActivityLogSummary}
      />
    </div>
  );
}
