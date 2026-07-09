"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CheckoutPaymentSelector from "@/components/customer/checkout-payment-selector";
import { formatSelectedVariationLabels } from "@/lib/menu-variations";
import type { KasaSessionDetail } from "@/lib/kasa/sessions-service";
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

type SessionPaymentClientProps = {
  tableNumber: number;
  businessName: string;
  initialSession: KasaSessionDetail;
  paymentFlags: TenantPaymentFlags;
};

export default function SessionPaymentClient({
  tableNumber,
  businessName,
  initialSession,
  paymentFlags,
}: SessionPaymentClientProps) {
  const [session, setSession] = useState(initialSession);
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod | "">(() =>
    pickDefaultPaymentMethod(paymentFlags, ""),
  );
  const [mealBrand, setMealBrand] = useState<MealCardBrandId | "">("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kasa/sessions?tableNumber=${tableNumber}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        session?: KasaSessionDetail;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.session) {
        setError(data.error ?? "Oturum yüklenemedi.");
        return;
      }
      setSession(data.session);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, [tableNumber]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

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
      `Masa ${tableNumber} — ${formatTry(session.sessionTotal)}\nÖdeme: ${label}\n\nTahsilatı onaylıyor musunuz?`,
    );
    if (!ok) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/kasa/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          paymentMethod: payMethod,
          mealCardBrandId: payMethod === "meal_card" ? mealBrand : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; sessionTotal?: number };
      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "Ödeme kaydedilemedi.");
        return;
      }
      window.alert(`Ödeme alındı.\nMasa ${tableNumber} kapatıldı.`);
      window.location.href = "/kasa";
    } catch {
      window.alert("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabel = session.status === "bill_requested" ? "Hesap istendi" : "Aktif";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/kasa"
            className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Masalar
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Kasa · Masa {tableNumber}
            </p>
            <p className="truncate text-sm font-semibold text-on-background">{businessName}</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-xl border border-surface-container-highest bg-white px-2.5 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-60"
          >
            {loading ? "…" : "Yenile"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {error ? (
          <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Oturum durumu</p>
            <p
              className={[
                "mt-1 font-headline text-lg font-bold",
                session.status === "bill_requested" ? "text-amber-800" : "text-on-background",
              ].join(" ")}
            >
              {statusLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Toplam</p>
            <p className="font-headline text-2xl font-black text-primary">{formatTry(session.sessionTotal)}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Siparişler</h2>
          {session.orders.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">Bu oturumda sipariş yok.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {session.orders.map((order) => (
                <li key={order.id} className="rounded-xl border border-surface-container-high bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-on-background">{order.orderCode}</p>
                      <p className="text-xs text-secondary">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                        {order.orderSource === "waiter" ? " · Garson" : order.orderSource === "table_qr" ? " · QR" : ""}
                      </p>
                    </div>
                    <p className="font-headline text-sm font-bold text-primary">{formatTry(order.total)}</p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-on-background">
                    {order.lines.map((line) => (
                      <li key={line.id} className="flex justify-between gap-2">
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
                  {order.orderNote.trim() ? (
                    <p className="mt-2 text-xs text-secondary">Mutfak notu: {order.orderNote}</p>
                  ) : null}
                  {order.courierNote.trim() ? (
                    <p className="mt-2 text-xs text-secondary">Kurye notu: {order.courierNote}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
          <CheckoutPaymentSelector
            options={paymentFlags}
            method={payMethod}
            mealCardBrandId={mealBrand}
            onMethodChange={setPayMethod}
            onMealCardBrandChange={setMealBrand}
          />
          <button
            type="button"
            disabled={submitting || session.orders.length === 0}
            onClick={() => void handleClosePayment()}
            className="mt-6 w-full rounded-2xl bg-gradient-to-b from-[#bc000c] to-[#e71418] py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Kaydediliyor…" : `Ödemeyi al ve masayı kapat (${formatTry(session.sessionTotal)})`}
          </button>
        </section>
      </main>
    </div>
  );
}
