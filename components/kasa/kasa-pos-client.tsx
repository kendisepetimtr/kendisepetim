"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import PublicMenuClient from "@/components/public-menu/public-menu-client";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { FulfillmentType, TenantFulfillmentFlags } from "@/lib/fulfillment";
import { useTenantOpsRealtime } from "@/lib/hooks/use-tenant-ops-realtime";
import type { KasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { LocalMenuState } from "@/lib/local-menu";
import type { AdminOrder } from "@/lib/orders";
import {
  pickDefaultPaymentMethod,
  paymentMethodLabel,
  type CheckoutPaymentMethod,
  type MealCardBrandId,
  type TenantPaymentFlags,
} from "@/lib/tenant-payment";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

export type KasaPosClientProps = {
  slug: string;
  tenantId: string;
  businessName: string;
  businessLogoUrl: string;
  businessCoverImageUrl: string;
  hoursPair: { open: string; close: string } | null;
  initialOpenStatus: boolean | null;
  initialClosedMessage: string;
  paymentFlags: TenantPaymentFlags;
  fulfillmentFlags: TenantFulfillmentFlags;
  initialMenu: LocalMenuState;
  channel: FulfillmentType;
  tableNumber?: number;
  backHref: string;
  backLabel: string;
  /** Masa oturumu (dine_in) — yoksa boş masa */
  initialSession?: KasaSessionDetail | null;
  /** Mevcut gel-al / paket siparişi */
  initialOrder?: AdminOrder | null;
};

export default function KasaPosClient({
  slug,
  tenantId,
  businessName,
  businessLogoUrl,
  businessCoverImageUrl,
  hoursPair,
  initialOpenStatus,
  initialClosedMessage,
  paymentFlags,
  fulfillmentFlags,
  initialMenu,
  channel,
  tableNumber,
  backHref,
  backLabel,
  initialSession = null,
  initialOrder = null,
}: KasaPosClientProps) {
  const [session, setSession] = useState(initialSession);
  const [order, setOrder] = useState(initialOrder);
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(paymentFlags, ""),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (channel !== "dine_in" || tableNumber == null) return;
    try {
      const res = await fetch(`/api/kasa/sessions?tableNumber=${tableNumber}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        session?: KasaSessionDetail;
        empty?: boolean;
      };
      if (res.ok && data.ok && data.session) {
        setSession(data.session);
      } else if (data.empty) {
        setSession(null);
      }
    } catch {
      /* ignore */
    }
  }, [channel, tableNumber]);

  const refreshOrder = useCallback(async () => {
    if (!order?.id) return;
    if (channel === "pickup") {
      const res = await fetch(`/api/kasa/pickup?orderId=${encodeURIComponent(order.id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; order?: AdminOrder };
      if (res.ok && data.ok && data.order) setOrder(data.order);
    } else if (channel === "delivery") {
      const res = await fetch(`/api/kasa/delivery?orderId=${encodeURIComponent(order.id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; order?: AdminOrder };
      if (res.ok && data.ok && data.order) setOrder(data.order);
    }
  }, [channel, order?.id]);

  useTenantOpsRealtime({
    tenantId,
    actions: ["order_created", "payment_closed", "bill_requested", "delivery_status_updated"],
    onEvent: () => {
      void refreshSession();
      void refreshOrder();
    },
  });

  const title =
    channel === "dine_in"
      ? `Masa ${tableNumber}`
      : channel === "pickup"
        ? order
          ? `Gel-Al · ${order.orderCode}`
          : "Gel-Al sipariş"
        : order
          ? `Paket · ${order.orderCode}`
          : "Paket sipariş";

  const payableTotal =
    channel === "dine_in"
      ? session?.sessionTotal ?? 0
      : order?.total ?? 0;

  const canPay =
    channel === "dine_in" ? (session?.orders.length ?? 0) > 0 : Boolean(order && order.status !== "completed");

  async function handleClosePayment() {
    if (!payMethod) {
      window.alert("Lütfen ödeme yöntemi seçin.");
      return;
    }
    if (payMethod === "meal_card" && !mealBrand) {
      window.alert("Lütfen yemek kartı türünü seçin.");
      return;
    }

    const label = paymentMethodLabel(payMethod, mealBrand || undefined);
    const ok = window.confirm(
      `${title} — ${formatTry(payableTotal)}\nÖdeme: ${label}\n\nTahsilatı onaylıyor musunuz?`,
    );
    if (!ok) return;

    setSubmitting(true);
    setError(null);
    try {
      if (channel === "dine_in" && tableNumber != null) {
        const res = await fetch("/api/kasa/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableNumber,
            paymentMethod: payMethod,
            mealCardBrandId: payMethod === "meal_card" ? mealBrand : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          window.alert(data.error ?? "Ödeme kaydedilemedi.");
          return;
        }
        window.location.href = "/kasa";
        return;
      }

      if (channel === "pickup" && order) {
        const res = await fetch("/api/kasa/pickup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod: payMethod,
            mealCardBrandId: payMethod === "meal_card" ? mealBrand : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          window.alert(data.error ?? "Ödeme kaydedilemedi.");
          return;
        }
        window.location.href = "/kasa/gel-al";
        return;
      }

      if (channel === "delivery" && order) {
        const res = await fetch("/api/kasa/delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "close",
            orderId: order.id,
            paymentMethod: payMethod,
            mealCardBrandId: payMethod === "meal_card" ? mealBrand : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          window.alert(data.error ?? "Ödeme kaydedilemedi.");
          return;
        }
        window.location.href = "/kasa/paket";
        return;
      }

      window.alert("Ödenecek sipariş yok. Önce ürün ekleyin.");
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayOrders: AdminOrder[] =
    channel === "dine_in" ? session?.orders ?? [] : order ? [order] : [];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 border-b border-surface-container-highest lg:border-b-0 lg:border-r">
        <div className="sticky top-0 z-30 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              {backLabel}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Kasa · POS</p>
              <p className="truncate text-sm font-semibold text-on-background">{title}</p>
            </div>
            <p className="shrink-0 font-headline text-sm font-black text-on-background">
              {formatTry(payableTotal)}
            </p>
          </div>
        </div>

        <PublicMenuClient
          slug={slug}
          businessName={businessName}
          businessLogoUrl={businessLogoUrl}
          businessCoverImageUrl={businessCoverImageUrl}
          publicDescription=""
          googleMapsUrl=""
          hoursPair={hoursPair}
          initialOpenStatus={initialOpenStatus}
          initialClosedMessage={initialClosedMessage}
          paymentFlags={paymentFlags}
          fulfillmentFlags={fulfillmentFlags}
          tableNumber={channel === "dine_in" ? tableNumber : undefined}
          cashierMode
          cashierFulfillment={channel}
          compactChrome
          onCashierOrderPlaced={async (result) => {
            if (channel === "dine_in") {
              await refreshSession();
              return;
            }
            // Yeni gel-al / paket → detay URL’ine geç
            if (channel === "pickup") {
              window.location.href = `/kasa/gel-al/${result.orderId}`;
            } else {
              window.location.href = `/kasa/paket/${result.orderId}`;
            }
          }}
          initialMenu={initialMenu}
        />
      </div>

      <aside className="flex flex-col bg-surface-container-lowest lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="border-b border-surface-container-highest px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Hesap</p>
          <p className="mt-1 font-headline text-2xl font-black text-on-background">{formatTry(payableTotal)}</p>
          {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
        </div>

        <div className="flex-1 space-y-3 px-4 py-4">
          {displayOrders.length === 0 ? (
            <p className="text-sm text-secondary">Henüz kalem yok. Menüden ürün ekleyin.</p>
          ) : (
            displayOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-surface-container-highest bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-primary">{o.orderCode}</p>
                  <p className="text-xs font-semibold text-on-background">{formatTry(o.total)}</p>
                </div>
                <ul className="mt-2 space-y-1">
                  {o.lines.map((line) => (
                    <li key={line.id} className="text-xs text-on-background">
                      <span className="font-semibold">
                        {line.qty}x {line.name}
                      </span>
                      {line.selectedOptions?.length ? (
                        <span className="block text-secondary">
                          {formatSelectedVariationLabels(line.selectedOptions).join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {o.orderNote ? (
                  <p className="mt-2 text-[11px] text-secondary">Not: {o.orderNote}</p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-surface-container-highest px-4 py-4">
          <CheckoutPaymentSelector
            options={paymentFlags}
            method={payMethod}
            mealCardBrandId={mealBrand}
            onMethodChange={(m) => {
              setPayMethod(m);
              if (m !== "meal_card") setMealBrand("");
            }}
            onMealCardBrandChange={setMealBrand}
          />
          <button
            type="button"
            disabled={!canPay || submitting}
            onClick={() => void handleClosePayment()}
            className="mt-4 w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-3.5 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Kaydediliyor…" : `Ödemeyi al · ${formatTry(payableTotal)}`}
          </button>
        </div>
      </aside>
    </div>
  );
}
