"use client";

import Link from "next/link";
import { getPrimaryPublicMenuUrl } from "@/lib/public-menu-urls";
import type { MarketplaceListing } from "@/lib/marketplace";
import { formatTry } from "@/lib/orders-report";
import { formatDistanceKm } from "@/lib/geo";
import {
  isRestaurantFavorited,
  toggleGuestRestaurantFavorite,
} from "@/lib/guest-favorites";
import { useEffect, useState } from "react";

type RestaurantCardProps = {
  listing: MarketplaceListing;
  distanceKm?: number | null;
  isCustomer?: boolean;
};

export default function RestaurantCard({ listing, distanceKm = null, isCustomer = false }: RestaurantCardProps) {
  const menuUrl = getPrimaryPublicMenuUrl(listing.subdomain);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isRestaurantFavorited(listing.subdomain));
  }, [listing.subdomain]);

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const was = fav;
    setFav(!was);
    if (isCustomer) {
      await fetch("/api/musteri/favorites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: was ? "remove" : "add",
          kind: "restaurant",
          subdomain: listing.subdomain,
          restaurantName: listing.businessName,
        }),
      });
      return;
    }
    toggleGuestRestaurantFavorite({ subdomain: listing.subdomain, restaurantName: listing.businessName });
  }

  return (
    <article
      className={[
        "group overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm transition hover:shadow-md",
        listing.isOpen ? "" : "opacity-70",
      ].join(" ")}
    >
      <div className={["relative h-40 bg-surface-container-low", listing.isOpen ? "" : "grayscale"].join(" ")}>
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.coverImageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-secondary/40">
            <span className="material-symbols-outlined text-5xl">storefront</span>
          </div>
        )}
        <span
          className={[
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            listing.isOpen ? "bg-emerald-600 text-white" : "bg-on-background/70 text-white",
          ].join(" ")}
        >
          {listing.isOpen ? "Açık" : "Kapalı"}
        </span>
        <button
          type="button"
          onClick={(e) => void toggleFav(e)}
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/95 shadow-sm"
          aria-label={fav ? "Favoriden çıkar" : "Favorilere ekle"}
        >
          <span
            className={["material-symbols-outlined text-[20px]", fav ? "text-[#bc000c]" : "text-secondary"].join(" ")}
            style={fav ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-surface-container-high bg-white">
            {listing.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-xl">restaurant</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-headline text-base font-bold text-on-background">{listing.businessName}</h3>
            <p className="mt-0.5 text-xs text-secondary">
              {listing.neighborhood}
              {distanceKm != null ? ` · ${formatDistanceKm(distanceKm)}` : ""}
            </p>
          </div>
        </div>

        {listing.cuisineTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {listing.cuisineTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-secondary">
          {listing.minOrderAmount != null && listing.minOrderAmount > 0 ? (
            <span>Min. {formatTry(listing.minOrderAmount)}</span>
          ) : null}
          {listing.fulfillmentDeliveryEnabled ? (
            <span>Teslimat {listing.deliveryRadiusKm} km</span>
          ) : null}
          {listing.fulfillmentPickupEnabled ? <span>Gel-al</span> : null}
        </div>

        <Link
          href={menuUrl}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
        >
          {listing.isOpen ? "Menüye git" : "Şu an kapalı, menüye bak"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}
