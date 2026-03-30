import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../lib/tenant";
import { PageShell } from "../../../../../components/ui/page-shell";
import { TenantCheckoutClient } from "./tenant-checkout-client";

type TenantCheckoutPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ mode?: string; table?: string }>;
};

export default async function TenantCheckoutPage({ params, searchParams }: TenantCheckoutPageProps) {
  const { tenant } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const normalizedTenant = normalizeTenantSlug(tenant);

  if (!isValidTenantSlug(normalizedTenant)) {
    notFound();
  }

  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) {
    notFound();
  }

  const modeRaw = String(resolvedSearch.mode ?? "").toLowerCase();
  const initialMode =
    modeRaw === "table" || modeRaw === "package" || modeRaw === "online" ? modeRaw : "online";
  const initialTableNumber = String(resolvedSearch.table ?? "");

  return (
    <PageShell title="Checkout" description={`${restaurant.name} siparis tamamlama adimi`}>
      <div className="space-y-4">
        <TenantCheckoutClient
          tenantSlug={restaurant.slug}
          initialMode={initialMode}
          initialTableNumber={initialTableNumber}
        />
        <Link href={`/t/${restaurant.slug}/cart`} className="inline-block text-sm text-gray-600 underline">
          Sepete don
        </Link>
      </div>
    </PageShell>
  );
}
