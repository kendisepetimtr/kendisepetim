"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import KasaOrderModal from "@/components/kasa/kasa-order-modal";
import KasaShellHeader from "@/components/kasa/kasa-shell-header";
import NotificationToastStack from "@/components/notifications/notification-toast-stack";
import type { GarsonTableCell } from "@/lib/garson/tables-service";
import type { KasaPickupSlot } from "@/lib/kasa/board-service";
import { useNotificationStream } from "@/lib/hooks/use-notification-stream";
import { useTenantOpsRealtime } from "@/lib/hooks/use-tenant-ops-realtime";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";
import type { LocalMenuState } from "@/lib/local-menu";
import type { FulfillmentType } from "@/lib/fulfillment";

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
    card: "border-surface-container-highest bg-surface-container-lowest hover:border-primary/40",
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

type OrderTarget =
  | { channel: "dine_in"; tableNumber: number }
  | { channel: "pickup" }
  | { channel: "delivery" };

type KasaPanelClientProps = {
  businessName: string;
  subdomain: string;
  tenantId: string;
  features: KasaFeatures;
  initialTables: GarsonTableCell[];
  initialPickupSlots: KasaPickupSlot[];
  menu: LocalMenuState;
};

export default function KasaPanelClient({
  businessName,
  subdomain,
  tenantId,
  features,
  initialTables,
  initialPickupSlots,
  menu,
}: KasaPanelClientProps) {
  const [tables, setTables] = useState(initialTables);
  const [pickupSlots, setPickupSlots] = useState(initialPickupSlots);
  const [error, setError] = useState<string | null>(null);
  const [orderTarget, setOrderTarget] = useState<OrderTarget | null>(null);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/kasa/tables", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        tables?: GarsonTableCell[];
        pickupSlots?: KasaPickupSlot[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Tahta yüklenemedi.");
        return;
      }
      setTables(data.tables ?? []);
      setPickupSlots(data.pickupSlots ?? []);
    } catch {
      setError("Bağlantı hatası.");
    }
  }, []);

  const { toasts, dismissToast, formatToastTitle, formatActivityLogSummary } = useNotificationStream({
    streamUrl: "/api/kasa/notifications/stream",
    refreshOnActions: REFRESH_ON_ACTIONS,
    onRefresh: refresh,
  });

  useTenantOpsRealtime({
    tenantId,
    actions: REFRESH_ON_ACTIONS,
    onEvent: () => void refresh(),
  });

  function openBasket() {
    const options: FulfillmentType[] = [];
    if (features.dineIn) options.push("dine_in");
    if (features.pickup) options.push("pickup");
    if (features.delivery) options.push("delivery");

    if (options.length === 1 && options[0] === "pickup") {
      setOrderTarget({ channel: "pickup" });
      return;
    }
    if (options.length === 1 && options[0] === "delivery") {
      setOrderTarget({ channel: "delivery" });
      return;
    }
    if (options.length === 1 && options[0] === "dine_in") {
      setChannelPickerOpen(false);
      window.alert("Sipariş için bir masa seçin.");
      return;
    }
    setChannelPickerOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <KasaShellHeader
        businessName={businessName}
        features={features}
        active="masalar"
        onBasketClick={openBasket}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <p className="mb-5 text-sm text-secondary">
          Masaya dokunun → sipariş. Gel-Al kartları QR veya kasadan gelen paket dışı siparişlerdir; boş Gel-Al ile
          yeni alın. Dolu kartlarda «Öde» ile tahsilat.
        </p>

        {features.dineIn && tables.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-secondary">Masalar</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tables.map((table) => {
                const copy = STATUS_COPY[table.status] ?? STATUS_COPY.empty;
                const occupied = table.status === "active" || table.status === "bill_requested";
                return (
                  <div
                    key={table.tableNumber}
                    className={[
                      "relative flex min-h-[132px] flex-col rounded-2xl border p-4 shadow-sm",
                      copy.card,
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setOrderTarget({ channel: "dine_in", tableNumber: table.tableNumber })}
                      className="flex min-h-0 flex-1 flex-col text-left active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-headline text-2xl font-black text-on-background">
                          {table.tableNumber}
                        </span>
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
                        <p className="mt-auto pt-3 text-xs text-secondary">Dokun → sipariş</p>
                      )}
                    </button>
                    {occupied ? (
                      <Link
                        href={`/kasa/masa/${table.tableNumber}`}
                        className="mt-3 inline-flex items-center justify-center rounded-xl bg-on-background px-3 py-2.5 text-xs font-bold text-white active:scale-95"
                      >
                        Öde
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {features.pickup ? (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-secondary">
              Gel-Al{" "}
              <span className="font-normal normal-case tracking-normal text-secondary/80">
                (açık sipariş + 1 boş)
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {pickupSlots.map((slot) => {
                const occupied = slot.status === "active";
                return (
                  <div
                    key={`gel-al-${slot.slotNumber}-${slot.orderId ?? "empty"}`}
                    className={[
                      "relative flex min-h-[132px] flex-col rounded-2xl border p-4 shadow-sm",
                      occupied
                        ? "border-sky-500/35 bg-sky-500/5 hover:border-sky-500/55"
                        : "border-dashed border-sky-500/40 bg-sky-500/5 hover:border-sky-500/60",
                    ].join(" ")}
                  >
                    {occupied ? (
                      <>
                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-headline text-lg font-black text-on-background">
                              Gel-Al {slot.slotNumber}
                            </span>
                            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                              Açık
                            </span>
                          </div>
                          <p className="mt-2 truncate text-xs font-semibold text-on-background">
                            {slot.customerLabel}
                          </p>
                          <p className="truncate text-[11px] text-secondary">{slot.orderCode}</p>
                          <p className="mt-auto pt-2 font-headline text-sm font-bold text-on-background">
                            {formatTry(slot.total)}
                          </p>
                        </div>
                        <Link
                          href={`/kasa/gel-al/${slot.orderId}`}
                          className="mt-3 inline-flex items-center justify-center rounded-xl bg-on-background px-3 py-2.5 text-xs font-bold text-white active:scale-95"
                        >
                          Öde
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOrderTarget({ channel: "pickup" })}
                        className="flex min-h-0 flex-1 flex-col text-left active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-headline text-lg font-black text-on-background">
                            Gel-Al {slot.slotNumber}
                          </span>
                          <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                            Yeni
                          </span>
                        </div>
                        <p className="mt-auto pt-3 text-xs text-secondary">Dokun → gel-al siparişi</p>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {channelPickerOpen ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-on-background/40 p-4 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="Kapat" onClick={() => setChannelPickerOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-surface-container-highest bg-white p-5 shadow-2xl">
            <p className="font-headline text-lg font-bold text-on-background">Sipariş tipi</p>
            <p className="mt-1 text-sm text-secondary">Masaya dokunarak da masa siparişi alabilirsiniz.</p>
            <div className="mt-4 grid gap-2">
              {features.pickup ? (
                <button
                  type="button"
                  className="rounded-2xl border border-surface-container-highest px-4 py-4 text-left text-sm font-bold active:scale-[0.99]"
                  onClick={() => {
                    setChannelPickerOpen(false);
                    setOrderTarget({ channel: "pickup" });
                  }}
                >
                  Gel-Al
                </button>
              ) : null}
              {features.delivery ? (
                <button
                  type="button"
                  className="rounded-2xl border border-surface-container-highest px-4 py-4 text-left text-sm font-bold active:scale-[0.99]"
                  onClick={() => {
                    setChannelPickerOpen(false);
                    setOrderTarget({ channel: "delivery" });
                  }}
                >
                  Paket
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-xl py-3 text-sm font-semibold text-secondary"
                onClick={() => setChannelPickerOpen(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {orderTarget ? (
        <KasaOrderModal
          open
          channel={orderTarget.channel}
          tableNumber={orderTarget.channel === "dine_in" ? orderTarget.tableNumber : undefined}
          title={
            orderTarget.channel === "dine_in"
              ? `Masa ${orderTarget.tableNumber}`
              : orderTarget.channel === "pickup"
                ? "Gel-Al"
                : "Paket"
          }
          businessName={businessName}
          subdomain={subdomain}
          menu={menu}
          onClose={() => setOrderTarget(null)}
          onOrderPlaced={() => void refresh()}
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
