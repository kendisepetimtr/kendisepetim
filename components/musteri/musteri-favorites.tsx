"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  clearGuestFavorites,
  getGuestFavorites,
  type GuestFavorite,
} from "@/lib/guest-favorites";
import type { CustomerFavorite } from "@/lib/musteri/favorites-service";
import { getOAuthSiteBase } from "@/lib/site-url";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";

type Props = {
  isCustomer: boolean;
  initialItems: CustomerFavorite[];
};

function menuUrl(subdomain: string) {
  if (typeof window === "undefined") return `https://${subdomain}.kendisepetim.com`;
  const host = window.location.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) {
    return `http://${subdomain}.localhost:${window.location.port || "3000"}`;
  }
  return `https://${subdomain}.kendisepetim.com`;
}

export default function MusteriFavorites({ isCustomer, initialItems }: Props) {
  const [guestItems, setGuestItems] = useState<GuestFavorite[]>([]);
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isCustomer) setGuestItems(getGuestFavorites().items);
  }, [isCustomer]);

  useEffect(() => {
    if (!isCustomer || guestItems.length === 0 && getGuestFavorites().items.length === 0) return;
    const local = getGuestFavorites().items;
    if (local.length === 0) return;
    startTransition(async () => {
      for (const g of local) {
        await fetch("/api/musteri/favorites", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            kind: g.kind,
            subdomain: g.subdomain,
            productId: g.productId,
            productName: g.productName,
            restaurantName: g.restaurantName,
          }),
        });
      }
      clearGuestFavorites();
      const res = await fetch("/api/musteri/favorites", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; items?: CustomerFavorite[] };
      if (data.ok && data.items) setItems(data.items);
    });
  }, [isCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (isCustomer) return items;
    return guestItems.map((g) => ({
      id: g.id,
      kind: g.kind,
      subdomain: g.subdomain,
      productId: g.productId ?? null,
      productName: g.productName ?? "",
      restaurantName: g.restaurantName,
      createdAt: g.createdAt,
    }));
  }, [isCustomer, items, guestItems]);

  const restaurants = rows.filter((r) => r.kind === "restaurant");
  const products = rows.filter((r) => r.kind === "product");

  if (!isCustomer) {
    return (
      <div>
        <Header />
        <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-background">
          Favoriler hesabınıza taşınır.{" "}
          <Link href={MUSTERI_LOGIN_PATH} className="font-bold text-primary underline-offset-2 hover:underline">
            Giriş yapın
          </Link>{" "}
          veya kayıt olun.
        </p>
        {/* Bu sayfa require auth ile korunuyor; yedek */}
      </div>
    );
  }

  return (
    <div>
      <Header />
      {pending ? <p className="mb-3 text-xs text-secondary">Cihaz favorileri aktarılıyor…</p> : null}

      <section className="mb-8">
        <h2 className="font-headline text-lg font-bold">Restoranlar</h2>
        {restaurants.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">Favori restoran yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {restaurants.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
              >
                <div>
                  <p className="font-bold text-on-background">{r.restaurantName}</p>
                  <p className="text-xs text-secondary">{r.subdomain}.kendisepetim.com</p>
                </div>
                <a
                  href={menuUrl(r.subdomain)}
                  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
                >
                  Hızlı sipariş
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-headline text-lg font-bold">Ürünler</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">Favori ürün yok. Menüdeki kalple ekleyin.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4"
              >
                <div>
                  <p className="font-bold text-on-background">{p.productName || "Ürün"}</p>
                  <p className="text-xs text-secondary">{p.restaurantName}</p>
                </div>
                <a
                  href={`${menuUrl(p.subdomain)}${p.productId ? `#urun-${p.productId}` : ""}`}
                  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
                >
                  Hızlı sipariş
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-sm text-secondary">
        <Link href={MUSTERI_HOME_PATH} className="font-bold text-primary">
          Keşfete dön
        </Link>
      </p>
      <p className="mt-2 text-center text-[11px] text-secondary">{getOAuthSiteBase()}</p>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <h1 className="font-headline text-2xl font-extrabold tracking-tight">Favoriler</h1>
      <p className="mt-1 text-sm text-secondary">Beğendiğiniz restoranlar ve ürünler.</p>
    </div>
  );
}
