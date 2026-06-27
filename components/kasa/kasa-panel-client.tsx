"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signOutCashierAction } from "@/app/kasa/actions";
import type { GarsonTableCell } from "@/lib/garson/tables-service";

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
  initialTables: GarsonTableCell[];
};

export default function KasaPanelClient({ businessName, initialTables }: KasaPanelClientProps) {
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

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Kasa</p>
            <h1 className="truncate font-headline text-xl font-extrabold text-on-background sm:text-2xl">
              {businessName}
            </h1>
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
            <form action={signOutCashierAction}>
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
                className={["flex min-h-[120px] flex-col rounded-2xl border p-4 shadow-sm transition", copy.card].join(
                  " ",
                )}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
