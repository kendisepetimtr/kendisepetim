"use client";

import { useCallback, useEffect, useState } from "react";
import DeliveryOrderDetailClient from "@/components/kasa/delivery-order-detail-client";
import DeliveryOrdersClient from "@/components/kasa/delivery-orders-client";
import KasaPanelClient, { type KasaPanelNavigateTarget } from "@/components/kasa/kasa-panel-client";
import KasaTableHubClient from "@/components/kasa/kasa-table-hub-client";
import PickupOrderPaymentClient from "@/components/kasa/pickup-order-payment-client";
import type { GarsonTableCell } from "@/lib/garson/tables-service";
import type { KasaClosedOrderCard, KasaPickupSlot } from "@/lib/kasa/board-service";
import type { KasaFeatures } from "@/lib/kasa/kasa-access";
import type { KasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { LocalMenuState } from "@/lib/local-menu";
import type { LocalTenantProfile } from "@/lib/local-tenant";
import { DASHBOARD_OPS_SURFACE } from "@/lib/ops/surface";
import type { AdminOrder } from "@/lib/orders";
import type { ReportDayStripItem } from "@/lib/orders-report";
import { courierDisplayName, type CourierRow } from "@/lib/supabase/courier-types";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

type OpsView =
  | { kind: "board" }
  | { kind: "paket"; tab?: "active" | "history" }
  | { kind: "masa"; tableNumber: number }
  | { kind: "gel-al"; orderId: string; history?: boolean }
  | { kind: "paket-order"; orderId: string; history?: boolean };

type BootstrapData = {
  tenantId: string;
  businessName: string;
  subdomain: string;
  features: KasaFeatures;
  paymentFlags: TenantPaymentFlags;
  menu: LocalMenuState;
  tables: GarsonTableCell[];
  pickupSlots: KasaPickupSlot[];
  closedOrders: KasaClosedOrderCard[];
  dayStrip: ReportDayStripItem[];
  dayModeLabel: string;
};

type DashboardOrdersOpsProps = {
  tenant: LocalTenantProfile;
  wideMode: boolean;
  onWideModeChange: (wide: boolean) => void;
};

export default function DashboardOrdersOps({ tenant, wideMode, onWideModeChange }: DashboardOrdersOpsProps) {
  const [boot, setBoot] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<OpsView>({ kind: "board" });
  const [boardKey, setBoardKey] = useState(0);
  const [basketSignal, setBasketSignal] = useState(0);

  const [session, setSession] = useState<KasaSessionDetail | null>(null);
  const [pickupOrder, setPickupOrder] = useState<AdminOrder | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<AdminOrder[]>([]);
  const [courierById, setCourierById] = useState<Record<string, CourierRow>>({});
  const [deliveryDetail, setDeliveryDetail] = useState<{
    order: AdminOrder;
    couriers: CourierRow[];
    courierName: string | null;
    open: boolean;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/ops/bootstrap", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as BootstrapData & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sipariş tahtası yüklenemedi.");
        setBoot(null);
        return;
      }
      setBoot(data);
    } catch {
      setError("Bağlantı hatası.");
      setBoot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const goBoard = useCallback(() => {
    setView({ kind: "board" });
    setSession(null);
    setPickupOrder(null);
    setDeliveryDetail(null);
    setBoardKey((k) => k + 1);
    void loadBootstrap();
  }, [loadBootstrap]);

  const openMasa = useCallback(async (tableNumber: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kasa/sessions?tableNumber=${tableNumber}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        empty?: boolean;
        session?: KasaSessionDetail;
        error?: string;
      };
      if (data.empty || !data.session) {
        setError(data.error ?? "Bu masada açık oturum yok.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Masa yüklenemedi.");
        return;
      }
      setSession(data.session);
      setView({ kind: "masa", tableNumber });
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openGelAl = useCallback(async (orderId: string, history = false) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kasa/pickup?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; order?: AdminOrder; error?: string };
      if (!res.ok || !data.ok || !data.order) {
        setError(data.error ?? "Gel-al siparişi yüklenemedi.");
        return;
      }
      setPickupOrder(data.order);
      setView({ kind: "gel-al", orderId, history });
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openPaketList = useCallback(async (tab: "active" | "history" = "active") => {
    setDetailLoading(true);
    setError(null);
    try {
      const activeRes = await fetch("/api/kasa/delivery", { cache: "no-store", credentials: "include" });
      const activeData = (await activeRes.json()) as {
        ok?: boolean;
        orders?: AdminOrder[];
        error?: string;
      };
      if (!activeRes.ok || !activeData.ok) {
        setError(activeData.error ?? "Paket listesi yüklenemedi.");
        return;
      }
      setCourierById({});
      setDeliveryOrders(activeData.orders ?? []);
      setView({ kind: "paket", tab });
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openPaketOrder = useCallback(async (orderId: string, history = false) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kasa/delivery?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        order?: AdminOrder;
        couriers?: CourierRow[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.order) {
        setError(data.error ?? "Paket siparişi yüklenemedi.");
        return;
      }
      const couriers = data.couriers ?? [];
      const assigned = couriers.find((c) => c.id === data.order!.courierId);
      setDeliveryDetail({
        order: data.order,
        couriers,
        courierName: data.order.courierName || (assigned ? courierDisplayName(assigned) : null),
        open: !history && data.order.status !== "completed" && data.order.status !== "cancelled",
      });
      setView({ kind: "paket-order", orderId, history });
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const onNavigate = useCallback(
    (target: KasaPanelNavigateTarget) => {
      if (target.kind === "masa") void openMasa(target.tableNumber);
      else if (target.kind === "gel-al") void openGelAl(target.orderId, Boolean(target.history));
      else if (target.kind === "paket") void openPaketList(target.tab ?? "active");
      else if (target.kind === "paket-order") void openPaketOrder(target.orderId, Boolean(target.history));
    },
    [openMasa, openGelAl, openPaketList, openPaketOrder],
  );

  useEffect(() => {
    if (!boot) return;
    if (!boot.features.dineIn && !boot.features.pickup && boot.features.delivery && view.kind === "board") {
      void openPaketList("active");
    }
  }, [boot, view.kind, openPaketList]);

  if (loading && !boot) {
    return <p className="py-16 text-center text-sm text-secondary">Sipariş tahtası yükleniyor…</p>;
  }

  if (error && !boot) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 px-4 py-8 text-center">
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={() => void loadBootstrap()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Yeniden dene
        </button>
      </div>
    );
  }

  if (!boot) return null;

  const features = boot.features;
  const showPaketTab = features.delivery;
  const showBoardTab = features.dineIn || features.pickup;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {showBoardTab ? (
            <button
              type="button"
              onClick={goBoard}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                view.kind === "board"
                  ? "bg-primary text-white"
                  : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
              ].join(" ")}
            >
              Masalar
            </button>
          ) : null}
          {showPaketTab ? (
            <button
              type="button"
              onClick={() => void openPaketList("active")}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                view.kind === "paket" || view.kind === "paket-order"
                  ? "bg-primary text-white"
                  : "border border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
              ].join(" ")}
            >
              Paket
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onWideModeChange(!wideMode)}
            className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
            title={wideMode ? "Normal görünüm" : "Geniş görünüm (sol paneli daralt)"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {wideMode ? "close_fullscreen" : "open_in_full"}
            </span>
            {wideMode ? "Normal" : "Geniş"}
          </button>
          {(view.kind === "board" || view.kind === "paket") && (features.dineIn || features.pickup || features.delivery) ? (
            <button
              type="button"
              onClick={() => {
                if (view.kind === "paket") {
                  /* delivery list has own basket */
                  return;
                }
                setBasketSignal((n) => n + 1);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] text-white shadow-md"
              aria-label="Yeni sipariş"
              title="Sipariş al"
            >
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_basket
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}
      {detailLoading ? <p className="text-sm text-secondary">Yükleniyor…</p> : null}

      {view.kind === "board" ? (
        <KasaPanelClient
          key={boardKey}
          businessName={boot.businessName || tenant.businessName}
          subdomain={boot.subdomain || tenant.subdomain}
          tenantId={boot.tenantId}
          features={boot.features}
          initialTables={boot.tables}
          initialPickupSlots={boot.pickupSlots}
          initialClosedOrders={boot.closedOrders}
          initialDayStrip={boot.dayStrip}
          initialDayModeLabel={boot.dayModeLabel}
          menu={boot.menu}
          paymentFlags={boot.paymentFlags}
          surface={DASHBOARD_OPS_SURFACE}
          embedded
          basketOpenSignal={basketSignal}
          onNavigate={onNavigate}
        />
      ) : null}

      {view.kind === "masa" && session && boot ? (
        <KasaTableHubClient
          tableNumber={view.tableNumber}
          businessName={boot.businessName}
          subdomain={boot.subdomain}
          initialSession={session}
          paymentFlags={boot.paymentFlags}
          menu={boot.menu}
          surface={DASHBOARD_OPS_SURFACE}
          embedded
          onBack={goBoard}
        />
      ) : null}

      {view.kind === "gel-al" && pickupOrder && boot ? (
        <PickupOrderPaymentClient
          order={pickupOrder}
          businessName={boot.businessName}
          subdomain={boot.subdomain}
          paymentFlags={boot.paymentFlags}
          readOnly={Boolean(view.history)}
          surface={DASHBOARD_OPS_SURFACE}
          embedded
          onBack={goBoard}
        />
      ) : null}

      {view.kind === "paket" && boot ? (
        <DeliveryOrdersClient
          businessName={boot.businessName}
          subdomain={boot.subdomain}
          tenantId={boot.tenantId}
          features={boot.features}
          initialOrders={deliveryOrders}
          courierById={courierById}
          menu={boot.menu}
          paymentFlags={boot.paymentFlags}
          initialTab={view.tab === "history" ? "history" : "active"}
          surface={DASHBOARD_OPS_SURFACE}
          embedded
          onBack={showBoardTab ? goBoard : undefined}
          onOpenOrder={(orderId, history) => void openPaketOrder(orderId, history)}
        />
      ) : null}

      {view.kind === "paket-order" && deliveryDetail && boot ? (
        <DeliveryOrderDetailClient
          order={deliveryDetail.order}
          couriers={deliveryDetail.couriers}
          businessName={boot.businessName}
          subdomain={boot.subdomain}
          paymentFlags={boot.paymentFlags}
          readOnly={!deliveryDetail.open || Boolean(view.history)}
          courierName={deliveryDetail.courierName}
          surface={DASHBOARD_OPS_SURFACE}
          embedded
          onBack={() => void openPaketList("active")}
        />
      ) : null}
    </div>
  );
}
