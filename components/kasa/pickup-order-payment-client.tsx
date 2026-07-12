"use client";

import Link from "next/link";
import { useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { AdminOrder } from "@/lib/orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
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

type PickupOrderPaymentClientProps = {
  order: AdminOrder;
  businessName: string;
  paymentFlags: TenantPaymentFlags;
};

export default function PickupOrderPaymentClient({
  order,
  businessName,
  paymentFlags,
}: PickupOrderPaymentClientProps) {
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(paymentFlags, order.paymentMethod),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">(
    order.paymentMethod === "meal_card" && order.mealCardBrandId ? order.mealCardBrandId : "",
  );
  const [submitting, setSubmitting] = useState(false);

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
      `${order.orderCode} — ${formatTry(order.total)}\nÖdeme: ${label}\n\nGel-Al kapatılsın mı? Slot boşalacak.`,
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/kasa/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
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
      window.alert(`Teslim edildi.\nÖdeme: ${label}\n${when}\nSipariş: ${data.orderCode ?? order.orderCode}`);
      window.location.href = "/kasa";
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/kasa"
            className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border border-surface-container-highest bg-white active:scale-95"
            aria-label="Geri"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Gel-Al · Ödeme</p>
            <p className="truncate text-sm font-semibold text-on-background">{businessName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-28">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <div>
            <p className="font-mono text-2xl font-black text-on-background">{order.orderCode}</p>
            <p className="mt-1 text-sm text-on-background">
              {order.firstName} {order.lastName}
            </p>
            <p className="text-xs text-secondary">{order.phone}</p>
            <p className="mt-2 text-xs text-secondary">
              {new Date(order.createdAt).toLocaleString("tr-TR")} · {ORDER_STATUS_LABELS[order.status]}
            </p>
          </div>
          <p className="font-headline text-3xl font-black text-primary">{formatTry(order.total)}</p>
        </div>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Ürünler</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2 text-on-background">
                <span>
                  {line.qty}× {line.name}
                  {line.selectedOptions.length > 0
                    ? ` – ${formatSelectedVariationLabels(line.selectedOptions).join(", ")}`
                    : ""}
                  {line.removedIngredients.length > 0
                    ? ` (${line.removedIngredients.join(", ")} çıkar)`
                    : ""}
                </span>
                <span className="shrink-0 tabular-nums text-secondary">
                  {formatTry(line.unitPrice * line.qty)}
                </span>
              </li>
            ))}
          </ul>
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
            disabled={submitting || !payMethod}
            onClick={() => void handleClosePayment()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[22px]">payments</span>
            {submitting ? "Kaydediliyor…" : `Ödemeyi al · Gel-Al kapat (${formatTry(order.total)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
