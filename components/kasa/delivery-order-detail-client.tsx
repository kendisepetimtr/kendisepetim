"use client";

import Link from "next/link";
import { useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import {
  DELIVERY_STATUS_LABELS,
  KASA_DELIVERY_FLOW_STATUSES,
} from "@/lib/delivery-status";
import type { DeliveryStatus } from "@/lib/fulfillment";
import type { AdminOrder } from "@/lib/orders";
import { googleMapsPlaceUrl } from "@/lib/maps-links";
import { formatAddressOneLine } from "@/lib/customer-address";
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
import { useKasaReceiptPrint } from "@/lib/hooks/use-receipt-print";
import CancelOrderDialog from "@/components/orders/cancel-order-dialog";
import type { OrderCancelReason } from "@/lib/order-cancel";

function formatTry(n: number): string {
  return `${Math.round(n)} ₺`;
}

type DeliveryOrderDetailClientProps = {
  order: AdminOrder;
  couriers: CourierRow[];
  businessName: string;
  subdomain: string;
  paymentFlags: TenantPaymentFlags;
  readOnly?: boolean;
  courierName?: string | null;
};

export default function DeliveryOrderDetailClient({
  order: initialOrder,
  couriers,
  businessName,
  subdomain,
  paymentFlags,
  readOnly = false,
  courierName = null,
}: DeliveryOrderDetailClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [selectedCourierId, setSelectedCourierId] = useState(order.courierId ?? "");
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(paymentFlags, order.paymentMethodAtClose ?? order.paymentMethod),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">(
    order.paymentMethod === "meal_card" && order.mealCardBrandId ? order.mealCardBrandId : "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { printOrder, printOrderIfAuto } = useKasaReceiptPrint(businessName, subdomain);

  const currentDeliveryStatus = order.deliveryStatus ?? "pending";
  const assignedCourier = couriers.find((c) => c.id === (selectedCourierId || order.courierId));
  const displayCourierName =
    courierName ||
    order.courierName ||
    (assignedCourier ? courierDisplayName(assignedCourier) : null);
  const mapUrl =
    order.customerLatitude != null && order.customerLongitude != null
      ? googleMapsPlaceUrl(order.customerLatitude, order.customerLongitude)
      : null;

  if (readOnly) {
    const closedPay = order.paymentMethodAtClose ?? order.paymentMethod;
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Link
              href="/kasa/paket?tab=history"
              className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-surface-container-highest bg-white active:scale-95"
              aria-label="Geri"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Paket · Geçmiş</p>
              <p className="truncate text-sm font-semibold text-on-background">{businessName}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const closePay = order.paymentMethodAtClose
                  ? { method: order.paymentMethodAtClose, mealCardBrandId: order.mealCardBrandId }
                  : undefined;
                void printOrder(order, closePay);
              }}
              className="inline-flex h-12 items-center gap-1 rounded-2xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              Fiş
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-900">
            Sipariş kapatıldı — salt okunur kayıt
          </div>

          <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-black text-on-background">{order.orderCode}</p>
                <p className="mt-1 text-sm text-on-background">
                  {order.firstName} {order.lastName} · {order.phone}
                </p>
                <p className="mt-2 text-xs text-secondary">
                  {ORDER_STATUS_LABELS[order.status]} · {DELIVERY_STATUS_LABELS[currentDeliveryStatus]}
                </p>
              </div>
              <p className="font-headline text-3xl font-black text-primary">{formatTry(order.total)}</p>
            </div>
            <p className="mt-3 text-sm text-on-background">{formatAddressOneLine(order.address)}</p>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                Haritada aç
              </a>
            ) : null}
          </div>

          <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="font-headline text-lg font-bold text-on-background">Teslimat özeti</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Kurye</dt>
                <dd className="mt-0.5 font-semibold text-on-background">{displayCourierName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Müşteri beyanı</dt>
                <dd className="mt-0.5 text-on-background">
                  {paymentMethodLabel(order.paymentMethod, order.mealCardBrandId)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Tahsil edilen</dt>
                <dd className="mt-0.5 font-semibold text-on-background">
                  {paymentMethodLabel(closedPay, order.mealCardBrandId)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-secondary">Kapanış</dt>
                <dd className="mt-0.5 text-on-background">
                  {order.paidAt
                    ? new Date(order.paidAt).toLocaleString("tr-TR")
                    : new Date(order.createdAt).toLocaleString("tr-TR")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="font-headline text-lg font-bold text-on-background">Ürünler</h2>
            <ul className="mt-3 space-y-2">
              {order.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-on-background">
                    {line.qty}x {line.name}
                  </span>
                  <span className="shrink-0 font-semibold">{formatTry(line.unitPrice * line.qty)}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    );
  }

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
      const data = (await res.json()) as { ok?: boolean; error?: string };
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

  async function handleStatusUpdate(
    status: DeliveryStatus,
    cancel?: { reason: OrderCancelReason; note: string },
  ) {
    setBusy(`status-${status}`);
    try {
      const res = await fetch("/api/kasa/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          orderId: order.id,
          deliveryStatus: status,
          cancelReason: cancel?.reason,
          cancelNote: cancel?.note,
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
    if (!selectedCourierId) {
      window.alert("Teslim eden kuryeyi seçin.");
      return;
    }
    if (!payMethod) {
      window.alert("Lütfen ödeme yöntemi seçin.");
      return;
    }
    if (payMethod === "meal_card" && !mealBrand) {
      window.alert("Lütfen yemek kartı türünü seçin.");
      return;
    }

    const closingCourierName = assignedCourier ? courierDisplayName(assignedCourier) : "Kurye";
    const label = paymentMethodLabel(payMethod, mealBrand || undefined);
    const ok = window.confirm(
      `${order.orderCode} — ${formatTry(order.total)}\nKurye: ${closingCourierName}\nÖdeme: ${label}\n\nTeslim + tahsilat onaylansın mı?`,
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
          courierId: selectedCourierId,
          paymentMethod: payMethod,
          mealCardBrandId: payMethod === "meal_card" ? mealBrand : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        orderCode?: string;
        paidAt?: string;
      };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Ödeme kaydedilemedi.");
        return;
      }
      const when = data.paidAt
        ? new Date(data.paidAt).toLocaleString("tr-TR")
        : new Date().toLocaleString("tr-TR");
      window.alert(
        `Teslim edildi.\nKurye: ${closingCourierName}\nÖdeme: ${label}\n${when}\nSipariş: ${data.orderCode ?? order.orderCode}`,
      );
      await printOrderIfAuto(order, {
        method: payMethod,
        mealCardBrandId: payMethod === "meal_card" ? mealBrand || undefined : undefined,
      });
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
            className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-surface-container-highest bg-white active:scale-95"
            aria-label="Geri"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Paket · Ödeme</p>
            <p className="truncate text-sm font-semibold text-on-background">{businessName}</p>
          </div>
          <button
            type="button"
            disabled={busy === "print"}
            onClick={() => {
              setBusy("print");
              void printOrder(order).finally(() => setBusy(null));
            }}
            className="inline-flex h-12 items-center gap-1 rounded-2xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary active:scale-95 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Fiş
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-32">
        <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-black text-on-background">{order.orderCode}</p>
              <p className="mt-1 text-sm text-on-background">
                {order.firstName} {order.lastName} · {order.phone}
              </p>
              <p className="mt-2 text-xs text-secondary">
                {ORDER_STATUS_LABELS[order.status]} · {DELIVERY_STATUS_LABELS[currentDeliveryStatus]}
              </p>
            </div>
            <p className="font-headline text-3xl font-black text-primary">{formatTry(order.total)}</p>
          </div>
          <p className="mt-3 text-sm text-on-background">{formatAddressOneLine(order.address)}</p>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Haritada aç
            </a>
          ) : null}
        </div>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Teslim eden kurye</h2>
          <p className="mt-1 text-xs text-secondary">Kapanışta kurye damgası ile kaydedilir.</p>
          {couriers.length === 0 ? (
            <p className="mt-3 text-sm text-amber-800">
              Aktif kurye yok. Dashboard → Operasyonlardan ekleyin.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {couriers.map((c) => {
                const selected = selectedCourierId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourierId(c.id)}
                    className={[
                      "flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-left active:scale-[0.99]",
                      selected ? "border-primary bg-primary/10" : "border-surface-container-highest bg-white",
                    ].join(" ")}
                  >
                    <span className="text-sm font-bold text-on-background">{courierDisplayName(c)}</span>
                    {c.phone ? <span className="text-xs text-secondary">{c.phone}</span> : null}
                  </button>
                );
              })}
            </div>
          )}
          {selectedCourierId && selectedCourierId !== order.courierId ? (
            <button
              type="button"
              disabled={busy === "courier"}
              onClick={() => void handleAssignCourier()}
              className="mt-3 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
            >
              Kuryeyi şimdi ata (opsiyonel)
            </button>
          ) : null}
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
                  "min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95",
                  currentDeliveryStatus === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-container-highest bg-white text-on-background",
                ].join(" ")}
              >
                {DELIVERY_STATUS_LABELS[status]}
              </button>
            ))}
            <button
              type="button"
              disabled={busy != null}
              onClick={() => setCancelOpen(true)}
              className="min-h-11 rounded-xl border border-error/30 px-3 py-2 text-xs font-semibold text-error"
            >
              İptal
            </button>
          </div>
        </section>

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
            labelVariant="counter"
          />
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container-highest bg-surface-container-lowest/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={busy === "close" || !selectedCourierId || !payMethod || couriers.length === 0}
            onClick={() => void handleClosePayment()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[22px]">delivery_dining</span>
            {busy === "close"
              ? "Kaydediliyor…"
              : `Kurye + ödeme ile kapat (${formatTry(order.total)})`}
          </button>
        </div>
      </div>
      <CancelOrderDialog
        open={cancelOpen}
        pending={busy != null}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason, note) => void handleStatusUpdate("cancelled", { reason, note })}
      />
    </div>
  );
}
