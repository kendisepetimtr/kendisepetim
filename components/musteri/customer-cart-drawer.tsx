"use client";

import Image from "next/image";
import Link from "next/link";
import { getPublicMenuCheckoutUrl } from "@/lib/public-menu-urls";
import {
  clearMarketplaceCart,
  getMarketplaceCart,
  marketplaceCartQty,
  marketplaceCartTotal,
  subscribeMarketplaceCart,
  type MarketplaceCart,
} from "@/lib/marketplace-cart";
import { formatTry } from "@/lib/orders-report";
import { useEffect, useState } from "react";

export default function CustomerCartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<MarketplaceCart | null>(null);

  useEffect(() => {
    const read = () => setCart(getMarketplaceCart());
    read();
    return subscribeMarketplaceCart(read);
  }, [open]);

  if (!open) return null;
  const qty = marketplaceCartQty(cart);
  const total = marketplaceCartTotal(cart);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" className="absolute inset-0 bg-[#1a1a1c]/45" aria-label="Kapat" onClick={onClose} />
      <aside className="relative z-[1] flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-container-highest px-4 py-3">
          <h2 className="font-headline text-lg font-extrabold">Sepet</h2>
          <button type="button" className="rounded-full p-2" onClick={onClose} aria-label="Kapat">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {!cart || qty === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <Image src="/ks-logo.png" alt="" width={72} height={72} className="opacity-80" />
            <p className="font-semibold">Sepetiniz boş</p>
            <p className="text-sm text-secondary">Aynı anda tek restorandan sipariş verebilirsiniz.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="text-sm font-bold text-primary">{cart.restaurantName}</p>
              <ul className="mt-3 space-y-3">
                {cart.lines.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-3 text-sm">
                    <span>
                      {line.qty}× {line.name}
                    </span>
                    <span className="font-semibold">{formatTry(line.unitPrice * line.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-surface-container-highest p-4">
              <p className="mb-3 flex justify-between font-bold">
                <span>Toplam</span>
                <span>{formatTry(total)}</span>
              </p>
              <Link
                href={getPublicMenuCheckoutUrl(cart.subdomain)}
                className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white"
                onClick={onClose}
              >
                Siparişi onayla
              </Link>
              <button
                type="button"
                className="mt-2 w-full py-2 text-xs font-semibold text-secondary"
                onClick={() => {
                  clearMarketplaceCart();
                  setCart(null);
                }}
              >
                Sepeti boşalt
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
