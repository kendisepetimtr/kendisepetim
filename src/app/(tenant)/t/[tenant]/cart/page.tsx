import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../lib/tenant";
import { PageShell } from "../../../../../components/ui/page-shell";
import { TenantCartClient } from "./tenant-cart-client";

type TenantCartPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function TenantCartPage({ params }: TenantCartPageProps) {
  const { tenant } = await params;
  const normalizedTenant = normalizeTenantSlug(tenant);

  if (!isValidTenantSlug(normalizedTenant)) {
    notFound();
  }

  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) {
    notFound();
  }

  return (
    <PageShell title="Sepet" description={`${restaurant.name} siparis ozeti`}>
      <div className="space-y-4">
        <TenantCartClient tenantSlug={restaurant.slug} />
        <Link href={`/t/${restaurant.slug}`} className="inline-block text-sm text-gray-600 underline">
          Menuye don
        </Link>
      </div>
    </PageShell>
  );
}
