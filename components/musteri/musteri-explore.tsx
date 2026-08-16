"use client";

import RestaurantCard from "@/components/marketplace/restaurant-card";
import { CUISINE_TAG_OPTIONS, type MarketplaceListing } from "@/lib/marketplace";
import { getSavedCustomerGeo, requestCustomerGeo, type CustomerGeo } from "@/lib/customer-geo";
import { asGeoPoint, distanceKm, isWithinDeliveryRadius } from "@/lib/geo";
import { LAUNCH_CITY, LAUNCH_DISTRICT, MURATPASA_NEIGHBORHOODS } from "@/lib/turkey-geography";
import { useEffect, useMemo, useState } from "react";

const PICKUP_NEAR_KM = 8;

type Props = {
  initialListings: MarketplaceListing[];
  isCustomer?: boolean;
};

function matchDistance(listing: MarketplaceListing, geo: CustomerGeo): number | null {
  const pin = asGeoPoint(listing.latitude, listing.longitude);
  if (!pin) return null;
  return distanceKm(pin, geo);
}

function isNearby(listing: MarketplaceListing, geo: CustomerGeo): boolean {
  const pin = asGeoPoint(listing.latitude, listing.longitude);
  if (!pin) return false;
  if (listing.fulfillmentDeliveryEnabled) {
    return isWithinDeliveryRadius(pin, geo, listing.deliveryRadiusKm);
  }
  if (listing.fulfillmentPickupEnabled) {
    return distanceKm(pin, geo) <= PICKUP_NEAR_KM;
  }
  return false;
}

export default function MusteriExplore({ initialListings, isCustomer = false }: Props) {
  const [search, setSearch] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cuisineTag, setCuisineTag] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [geo, setGeo] = useState<CustomerGeo | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "ok" | "denied">("idle");

  useEffect(() => {
    const saved = getSavedCustomerGeo();
    if (saved) {
      setGeo(saved);
      setGeoStatus("ok");
      return;
    }
    setGeoStatus("asking");
    void requestCustomerGeo()
      .then((g) => {
        setGeo(g);
        setGeoStatus("ok");
      })
      .catch(() => setGeoStatus("denied"));
  }, []);

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

  const nearby = useMemo(() => {
    if (!geo) return [];
    return filtered
      .filter((l) => isNearby(l, geo))
      .sort((a, b) => {
        const da = matchDistance(a, geo) ?? 999;
        const db = matchDistance(b, geo) ?? 999;
        return da - db;
      });
  }, [filtered, geo]);

  const shown = geo && geoStatus === "ok" ? nearby : filtered;
  const emptyAll = initialListings.length === 0;
  const emptyFiltered = !emptyAll && shown.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
          Yakınınızdaki mutfak, kendi sepetiniz.
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {LAUNCH_CITY} {LAUNCH_DISTRICT} — gel-al veya işletmenin kendi teslimatı.
        </p>
        {geoStatus === "asking" ? (
          <p className="mt-2 text-xs text-secondary">Konumunuz alınıyor; yakın restoranlar eşleştirilecek.</p>
        ) : null}
        {geoStatus === "denied" ? (
          <button
            type="button"
            className="mt-2 text-xs font-bold text-primary"
            onClick={() => {
              setGeoStatus("asking");
              void requestCustomerGeo()
                .then((g) => {
                  setGeo(g);
                  setGeoStatus("ok");
                })
                .catch(() => setGeoStatus("denied"));
            }}
          >
            Konumu aç — yakındaki mutfakları göster
          </button>
        ) : null}
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

      {emptyAll ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/40 px-6 py-16 text-center">
          <p className="font-headline text-lg font-bold text-on-background">Yakında restoran eklenecek</p>
          <p className="mt-2 text-sm text-secondary">Muratpaşa’daki mutfaklar burada listelenecek.</p>
        </div>
      ) : emptyFiltered ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/40 px-6 py-16 text-center">
          <p className="font-headline text-lg font-bold text-on-background">Yakında restoran eklenecek</p>
          <p className="mt-2 text-sm text-secondary">
            {geoStatus === "ok"
              ? "Konumunuza göre teslimat alanında restoran yok. Filtreleri değiştirin veya biraz sonra tekrar bakın."
              : "Filtreleri değiştirin veya yakında yeni restoranlar eklenecek."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((listing) => (
            <RestaurantCard
              key={listing.id}
              listing={listing}
              isCustomer={isCustomer}
              distanceKm={geo ? matchDistance(listing, geo) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
