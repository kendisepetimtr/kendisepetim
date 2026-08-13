"use client";

import RestaurantCard from "@/components/marketplace/restaurant-card";
import { CUISINE_TAG_OPTIONS } from "@/lib/marketplace";
import { LAUNCH_CITY, LAUNCH_DISTRICT, MURATPASA_NEIGHBORHOODS } from "@/lib/turkey-geography";
import type { MarketplaceListing } from "@/lib/marketplace";
import { useMemo, useState } from "react";

type Props = {
  initialListings: MarketplaceListing[];
};

export default function MusteriExplore({ initialListings }: Props) {
  const [search, setSearch] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cuisineTag, setCuisineTag] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = useMemo(() => {
    let items = [...initialListings];
    if (neighborhood) items = items.filter((l) => l.neighborhood === neighborhood);
    if (cuisineTag) items = items.filter((l) => l.cuisineTags.includes(cuisineTag));
    if (openOnly) items = items.filter((l) => l.isOpen);
    if (search.trim()) {
      const q = search.trim().toLocaleLowerCase("tr");
      items = items.filter(
        (l) =>
          l.businessName.toLocaleLowerCase("tr").includes(q) ||
          l.publicDescription.toLocaleLowerCase("tr").includes(q) ||
          l.neighborhood.toLocaleLowerCase("tr").includes(q),
      );
    }
    return items;
  }, [initialListings, neighborhood, cuisineTag, openOnly, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Sipariş ver
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {LAUNCH_CITY} {LAUNCH_DISTRICT} — menüye gir, gel-al veya teslimat.
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Restoran ara…"
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm sm:col-span-2 lg:col-span-1"
        />
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tüm mahalleler</option>
          {MURATPASA_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={cuisineTag}
          onChange={(e) => setCuisineTag(e.target.value)}
          className="rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tüm mutfaklar</option>
          {CUISINE_TAG_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
            className="h-4 w-4 rounded text-primary"
          />
          Yalnızca açık
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/40 px-6 py-16 text-center">
          <p className="font-headline text-lg font-bold text-on-background">Sonuç bulunamadı</p>
          <p className="mt-2 text-sm text-secondary">Filtreleri değiştirin veya yakında yeni restoranlar eklenecek.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <RestaurantCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
