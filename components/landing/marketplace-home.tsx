import RestaurantCard from "@/components/marketplace/restaurant-card";
import RestaurantLanding from "@/components/landing/restaurant-landing";
import { LAUNCH_CITY, LAUNCH_DISTRICT } from "@/lib/turkey-geography";
import type { MarketplaceListing } from "@/lib/marketplace";
import Link from "next/link";

type MarketplaceHomeProps = {
  featuredListings: MarketplaceListing[];
};

export default function MarketplaceHome({ featuredListings }: MarketplaceHomeProps) {
  return (
    <>
      <section className="border-b border-surface-container-highest bg-gradient-to-b from-surface-container-low/80 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Marketplace</p>
            <h1 className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-on-background sm:text-5xl">
              {LAUNCH_CITY} {LAUNCH_DISTRICT}&apos;da restoran keşfet
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-secondary">
              Yakınınızdaki restoranlardan sipariş verin — gel-al veya restoran teslimatı. Her restoran kendi
              menüsünde, kendi markasıyla.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/kesfet"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-container"
              >
                Tüm restoranları gör
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <Link
                href="/kayit"
                className="inline-flex items-center gap-2 rounded-2xl border border-surface-container-highest bg-white px-6 py-3 text-sm font-bold text-on-background hover:bg-surface-container-low"
              >
                Restoranını kaydet
              </Link>
            </div>
          </div>

          {featuredListings.length > 0 ? (
            <div className="mt-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <h2 className="font-headline text-xl font-bold text-on-background">Öne çıkan restoranlar</h2>
                <Link href="/kesfet" className="text-sm font-semibold text-primary hover:underline">
                  Tümünü gör
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredListings.slice(0, 6).map((listing) => (
                  <RestaurantCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-12 rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/30 px-6 py-10 text-center">
              <p className="font-headline text-lg font-bold text-on-background">Yakında burada restoranlar olacak</p>
              <p className="mt-2 text-sm text-secondary">
                İlk restoranlar marketplace profilini tamamlayınca bu alanda görünecek.
              </p>
            </div>
          )}
        </div>
      </section>

      <RestaurantLanding skipHero />
    </>
  );
}
