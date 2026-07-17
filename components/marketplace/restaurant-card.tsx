import Link from "next/link";
import { getPrimaryPublicMenuUrl } from "@/lib/public-menu-urls";
import type { MarketplaceListing } from "@/lib/marketplace";

type RestaurantCardProps = {
  listing: MarketplaceListing;
};

export default function RestaurantCard({ listing }: RestaurantCardProps) {
  const menuUrl = getPrimaryPublicMenuUrl(listing.subdomain);

  return (
    <article className="group overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm transition hover:shadow-md">
      <div className="relative h-40 bg-surface-container-low">
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
            <p className="mt-0.5 text-xs text-secondary">{listing.neighborhood}</p>
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

        {listing.signatureDishName ? (
          <p className="mt-3 text-xs text-secondary">
            <span className="font-semibold text-on-background">{listing.signatureDishName}</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-secondary">
          {listing.fulfillmentDeliveryEnabled ? (
            <span>{listing.deliveryRadiusKm} km teslimat</span>
          ) : null}
          {listing.fulfillmentPickupEnabled ? <span>Gel-al</span> : null}
        </div>

        <Link
          href={menuUrl}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
        >
          Menüye git
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}
