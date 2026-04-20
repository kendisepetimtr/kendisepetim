"use client";

import { formatAddressOneLine } from "@/lib/customer-address";
import { getLocalOrders, type LocalOrder } from "@/lib/local-orders";
import { paymentMethodLabel } from "@/lib/tenant-payment";
import { useCallback, useEffect, useState } from "react";

function NoteWithMapLinks({ text }: { text: string }) {
  if (!text.trim()) return <span className="text-secondary/70">—</span>;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (
    <div className="space-y-2 text-xs leading-relaxed text-secondary">
      {text.split(/\n+/).filter(Boolean).map((para, i) => {
        const parts = para.split(urlRegex);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              /^https?:\/\//.test(part) ? (
                <a
                  key={j}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-container"
                >
                  Haritada aç
                </a>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

type DashboardOrdersListProps = {
  subdomain: string;
};

export default function DashboardOrdersList({ subdomain }: DashboardOrdersListProps) {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setOrders(getLocalOrders(subdomain).orders);
  }, [subdomain]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-6 py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-secondary/40">receipt_long</span>
        <p className="mt-4 font-headline text-lg font-bold text-on-background">Henüz sipariş yok</p>
        <p className="mt-2 text-sm text-secondary">
          QR menüden verilen siparişler bu cihazda listelenir. Canlı ortamda tüm cihazlardan görünecek.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const expanded = openId === o.id;
        return (
          <li
            key={o.id}
            className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenId(expanded ? null : o.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-surface-container-low/80"
            >
              <div className="min-w-0">
                <p className="font-headline text-sm font-bold text-on-background">
                  {o.firstName} {o.lastName}
                </p>
                <p className="mt-0.5 text-xs text-secondary">
                  {new Date(o.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {paymentMethodLabel(o.paymentMethod, o.mealCardBrandId)}
                </p>
              </div>
              <span className="material-symbols-outlined shrink-0 text-secondary">
                {expanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            {expanded ? (
              <div className="border-t border-surface-container-high bg-surface-container-low/40 px-4 py-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Sipariş no</p>
                <p className="mt-1 font-mono text-sm font-medium text-on-background">{o.id}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Ürünler</p>
                <ul className="mt-2 space-y-1 text-secondary">
                  {o.lines.map((l) => (
                    <li key={`${o.id}-${l.productId}-${l.name}`}>
                      {l.name} × {l.qty}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Telefon</p>
                <p className="mt-1 text-on-background">{o.phone || "—"}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Adres</p>
                <p className="mt-1 text-secondary">{formatAddressOneLine(o.address)}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Not</p>
                <div className="mt-1">
                  <NoteWithMapLinks text={o.orderNote} />
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
