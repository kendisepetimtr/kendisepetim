"use client";

import { useCallback, useEffect, useState } from "react";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import KasaOrderModal from "@/components/kasa/kasa-order-modal";
import { signOutWaiterAction } from "@/app/garson/actions";
import type { GarsonTableCell } from "@/lib/garson/tables-service";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import type { LocalMenuState } from "@/lib/local-menu";

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
    card: "border-surface-container-highest bg-surface-container-lowest hover:border-primary/30",
  },
  active: {
    label: "Dolu",
    chip: "bg-emerald-500/15 text-emerald-800",
    card: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
  },
  bill_requested: {
    label: "Hesap istendi",
    chip: "bg-amber-500/15 text-amber-900",
    card: "border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60",
  },
  closed: {
    label: "Kapalı",
    chip: "bg-surface-container-high text-secondary",
    card: "border-surface-container-highest bg-surface-container-lowest",
  },
};

type GarsonPanelClientProps = {
  businessName: string;
  subdomain: string;
  waiterDisplayName: string;
  menu: LocalMenuState;
  initialTables: GarsonTableCell[];
};

export default function GarsonPanelClient({
  businessName,
  subdomain,
  waiterDisplayName,
  menu,
  initialTables,
}: GarsonPanelClientProps) {
  const [tables, setTables] = useState(initialTables);
  const [loading, setLoading] = useState(false);
  const [billBusy, setBillBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderTable, setOrderTable] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/garson/tables", { cache: "no-store" });
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
    streamUrl: "/api/garson/notifications/stream",
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: refresh,
  });

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function handleBillRequest(tableNumber: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBillBusy(tableNumber);
    setError(null);
    try {
      const res = await fetch("/api/garson/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Hesap isteği gönderilemedi.");
        return;
      }
      await refresh();
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setBillBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Garson</p>
            <h1 className="truncate font-headline text-xl font-extrabold text-on-background sm:text-2xl">
              {businessName}
            </h1>
            <p className="mt-0.5 truncate text-xs text-secondary">{waiterDisplayName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {loading ? "…" : "Yenile"}
            </button>
            <form action={signOutWaiterAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
              >
                Kullanıcı değiştir
              </button>
            </form>
            <form action={signOutWaiterAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <p className="mb-5 text-sm text-secondary">
          Masaya dokunarak sipariş alın. Dolu masalarda hesap isteğini kasaya iletebilirsiniz. Fiş basımı kasa /
          paneldedir.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table) => {
            const copy = STATUS_COPY[table.status] ?? STATUS_COPY.empty;
            const occupied = table.status === "active" || table.status === "bill_requested";
            return (
              <div key={table.tableNumber} className="relative">
                <button
                  type="button"
                  onClick={() => setOrderTable(table.tableNumber)}
                  className={[
                    "flex min-h-[120px] w-full flex-col rounded-2xl border p-4 text-left shadow-sm transition",
                    copy.card,
                  ].join(" ")}
                >
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
                    <p className="mt-auto pt-3 text-xs text-secondary">Sipariş al</p>
                  )}
                </button>
                {occupied && table.status === "active" ? (
                  <button
                    type="button"
                    disabled={billBusy === table.tableNumber}
                    onClick={(e) => void handleBillRequest(table.tableNumber, e)}
                    className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-500/40 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-60"
                  >
                    {billBusy === table.tableNumber ? "…" : "Hesap iste"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>

      {orderTable != null ? (
        <KasaOrderModal
          open
          channel="dine_in"
          tableNumber={orderTable}
          title={`Masa ${orderTable}`}
          businessName={businessName}
          subdomain={subdomain}
          menu={menu}
          ordersEndpoint="/api/garson/orders"
          skipPrint
          onClose={() => setOrderTable(null)}
          onOrderPlaced={() => {
            setOrderTable(null);
            void refresh();
          }}
        />
      ) : null}

      <NotificationToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        formatTitle={formatToastTitle}
        formatSummary={formatActivityLogSummary}
      />
    </div>
  );
}
