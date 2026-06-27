"use client";

import Link from "next/link";
import { useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import { formatAddressOneLine } from "@/lib/customer-address";
import {
  DELIVERY_STATUS_LABELS,
  KASA_DELIVERY_FLOW_STATUSES,
} from "@/lib/delivery-status";
import type { DeliveryStatus } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import { googleMapsPlaceUrl } from "@/lib/maps-links";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { courierDisplayName } from "@/lib/supabase/courier-types";
import type { CourierRow } from "@/lib/supabase/courier-types";
import {
  paymentMethodLabel,
  pickDefaultPaymentMethod,
  type CheckoutPaymentMethod,
  type MealCardBrandId,
  type TenantPaymentFlags,
} from "@/lib/tenant-payment";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

type DeliveryOrderDetailClientProps = {
  order: AdminOrder;
  couriers: CourierRow[];
  businessName: string;
  paymentFlags: TenantPaymentFlags;
};

export default function DeliveryOrderDetailClient({
  order: initialOrder,
  couriers,
  businessName,
  paymentFlags,
}: DeliveryOrderDetailClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [selectedCourierId, setSelectedCourierId] = useState(order.courierId ?? "");
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(paymentFlags, order.paymentMethod),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">(
    order.paymentMethod === "meal_card" && order.mealCardBrandId ? order.mealCardBrandId : "",
  );
  const [busy, setBusy] = useState<string | null>(null);

  const currentDeliveryStatus = order.deliveryStatus ?? "pending";
  const assignedCourier = couriers.find((c) => c.id === order.courierId);
  const mapUrl =
    order.customerLatitude != null && order.customerLongitude != null
      ? googleMapsPlaceUrl(order.customerLatitude, order.customerLongitude)
      : null;

  const canClosePayment =
    currentDeliveryStatus === "out_for_delivery" || currentDeliveryStatus === "ready_for_dispatch";

  async function reloadOrder() {
    const res = await fetch(`/api/kasa/delivery?orderId=${order.id}`, { cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean; order?: AdminOrder };
    if (res.ok && data.ok && data.order) {
      setOrder(data.order);
      if (data.order.courierId) setSelectedCourierId(data.order.courierId);
    }
  }

  async function handleAssignCourier() {
    if (!selectedCourierId) {
      window.alert("Kurye seçin.");
      return;
    }
    setBusy("courier");
    try {
      const res = await fetch("/api/kasa/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign-courier",
          orderId: order.id,
          courierId: selectedCourierId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; courierName?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Kurye atanamadı.");
        return;
      }
      await reloadOrder();
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStatusUpdate(status: DeliveryStatus) {
    setBusy(`status-${status}`);
    try {
      const res = await fetch("/api/kasa/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          orderId: order.id,
          deliveryStatus: status,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Durum güncellenemedi.");
        return;
      }
      if (status === "cancelled") {
        window.location.href = "/kasa/paket";
        return;
      }
      await reloadOrder();
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setBusy(null);
    }
  }

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
      `${order.orderCode} — ${formatTry(order.total)}\nÖdeme: ${label}\n\nTeslim edildi olarak işaretlensin mi?`,
    );
    if (!ok) return;

    setBusy("close");
    try {
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
      const data = (await res.json()) as { ok?: boolean; error?: string; orderCode?: string };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Ödeme kaydedilemedi.");
        return;
      }
      window.alert(`Teslim edildi.\nSipariş: ${data.orderCode ?? order.orderCode}`);
      window.location.href = "/kasa/paket";
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/kasa/paket"
            className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Paket
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Paket</p>
            <p className="truncate text-sm font-semibold text-on-background">{businessName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-black text-on-background">{order.orderCode}</p>
              <p className="mt-1 text-sm text-on-background">
                {order.firstName} {order.lastName} · {order.phone}
              </p>
              <p className="mt-2 text-xs text-secondary">
                {ORDER_STATUS_LABELS[order.status]} ·{" "}
                {DELIVERY_STATUS_LABELS[currentDeliveryStatus]}
              </p>
            </div>
            <p className="font-headline text-2xl font-black text-primary">{formatTry(order.total)}</p>
          </div>
          <p className="mt-3 text-sm text-on-background">{formatAddressOneLine(order.address)}</p>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Haritada aç
            </a>
          ) : null}
        </div>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Ürünler</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2 text-on-background">
                <span>
                  {line.qty}× {line.name}
                </span>
                <span className="shrink-0 tabular-nums text-secondary">
                  {formatTry(line.unitPrice * line.qty)}
                </span>
              </li>
            ))}
          </ul>
          {order.orderNote.trim() ? (
            <p className="mt-4 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-secondary">
              Not: {order.orderNote}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Kurye</h2>
          {assignedCourier ? (
            <p className="mt-2 text-sm text-on-background">
              Atanan: <span className="font-semibold">{courierDisplayName(assignedCourier)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">Henüz kurye atanmadı</p>
          )}
          {couriers.length === 0 ? (
            <p className="mt-3 text-xs text-secondary">
              Aktif kurye yok. Dashboard → Ayarlar → Operasyon bölümünden ekleyin.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="flex-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background"
              >
                <option value="">Kurye seçin</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {courierDisplayName(c)}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy === "courier" || !selectedCourierId}
                onClick={() => void handleAssignCourier()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-container disabled:opacity-60"
              >
                {busy === "courier" ? "…" : "Ata"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Teslimat durumu</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {KASA_DELIVERY_FLOW_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy != null}
                onClick={() => void handleStatusUpdate(status)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  currentDeliveryStatus === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-container-highest bg-white text-on-background hover:bg-surface-container-low",
                ].join(" ")}
              >
                {DELIVERY_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => {
              if (window.confirm("Sipariş iptal edilsin mi?")) void handleStatusUpdate("cancelled");
            }}
            className="mt-4 text-xs font-semibold text-error hover:underline disabled:opacity-60"
          >
            Siparişi iptal et
          </button>
        </section>

        {canClosePayment ? (
          <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
            <p className="mb-4 text-xs text-secondary">
              Müşteri beyanı: {paymentMethodLabel(order.paymentMethod, order.mealCardBrandId)}
            </p>
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
              disabled={busy === "close"}
              onClick={() => void handleClosePayment()}
              className="mt-6 w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy === "close" ? "Kaydediliyor…" : `Ödemeyi al ve teslim et (${formatTry(order.total)})`}
            </button>
          </section>
        ) : (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
            Ödeme almak için siparişi «Kuryeye hazır» veya «Yolda» durumuna getirin.
          </p>
        )}
      </main>
    </div>
  );
}
