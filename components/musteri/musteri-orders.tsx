"use client";

import Link from "next/link";
import { formatAddressOneLine } from "@/lib/customer-address";
import { listAllLocalOrders, type LocalOrder } from "@/lib/local-orders";
import { MUSTERI_HOME_PATH } from "@/lib/musteri/paths";
import type { MusteriOrderView } from "@/lib/musteri/orders-service";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { DELIVERY_STATUS_LABELS } from "@/lib/delivery-status";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { useEffect, useState } from "react";

type Props = {
  accountOrders: MusteriOrderView[];
  isCustomer: boolean;
  restaurantNames?: Record<string, string>;
};

function money(n: number) {
  return `${Math.round(n).toLocaleString("tr-TR")} ₺`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MusteriOrders({ accountOrders, isCustomer, restaurantNames = {} }: Props) {
  const [guestOrders, setGuestOrders] = useState<LocalOrder[]>([]);

  useEffect(() => {
    setGuestOrders(listAllLocalOrders());
  }, []);

  if (isCustomer) {
    return (
      <div>
        <Header />
        {accountOrders.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {accountOrders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-headline text-base font-bold text-on-background">{o.restaurantName}</p>
                    <p className="mt-0.5 text-xs text-secondary">
                      {o.orderCode} · {formatWhen(o.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-on-background">{money(o.total)}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-primary">
                  {o.deliveryStatus
                    ? DELIVERY_STATUS_LABELS[o.deliveryStatus]
                    : ORDER_STATUS_LABELS[o.status]}
                  {o.fulfillmentType ? ` · ${fulfillmentTypeLabel(o.fulfillmentType)}` : ""}
                </p>
                {o.addressLine !== "—" ? (
                  <p className="mt-1 text-xs text-secondary">{o.addressLine}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <Header />
      <p className="mb-4 rounded-xl border border-surface-container-highest bg-surface-container-low/50 px-4 py-3 text-sm text-secondary">
        Misafir siparişleri bu cihazda saklanır. Hesap açarsanız sonraki siparişler hesabınıza yazılır.
      </p>
      {guestOrders.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {guestOrders.map((o) => (
            <li
              key={`${o.subdomain}-${o.id}`}
              className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-headline text-base font-bold text-on-background">
                    {restaurantNames[o.subdomain] ?? o.subdomain}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {o.id} · {formatWhen(o.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-bold text-on-background">{money(o.total)}</p>
              </div>
              <p className="mt-2 text-xs text-secondary">{formatAddressOneLine(o.address)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <h1 className="font-headline text-2xl font-extrabold tracking-tight">Siparişlerim</h1>
      <p className="mt-1 text-sm text-secondary">Önceki ve bu cihazdaki siparişleriniz.</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-surface-container-highest px-6 py-14 text-center">
      <p className="font-headline text-lg font-bold">Henüz sipariş yok</p>
      <p className="mt-2 text-sm text-secondary">Restoran seçip sipariş verdiğinizde burada görünür.</p>
      <Link
        href={MUSTERI_HOME_PATH}
        className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
      >
        Restoranlara git
      </Link>
    </div>
  );
}
