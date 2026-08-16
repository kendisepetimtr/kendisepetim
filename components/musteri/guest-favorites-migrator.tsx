"use client";

import { clearGuestFavorites, getGuestFavorites } from "@/lib/guest-favorites";
import { useEffect } from "react";

export default function GuestFavoritesMigrator({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const items = getGuestFavorites().items;
    if (items.length === 0) return;
    void (async () => {
      for (const g of items) {
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
    })();
  }, [enabled]);
  return null;
}
