import { notFound } from "next/navigation";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../lib/tenant";
import { getCategoriesByRestaurantId, getActiveProductsByRestaurantId } from "../../../../features/menu";
import { getRestaurantBySlug } from "../../../../features/tenants";
import { PageShell } from "../../../../components/ui/page-shell";
import { TenantMenuClient } from "./menu-client";

type TenantPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function TenantMenuPage({ params }: TenantPageProps) {
  const { tenant } = await params;
  const normalizedTenant = normalizeTenantSlug(tenant);

  if (!isValidTenantSlug(normalizedTenant)) {
    notFound();
  }

  const restaurant = await getRestaurantBySlug(normalizedTenant);
  if (!restaurant) {
    notFound();
  }

  const [categories, products] = await Promise.all([
    getCategoriesByRestaurantId(restaurant.id),
    getActiveProductsByRestaurantId(restaurant.id),
  ]);

  return (
    <PageShell
      title={restaurant.name}
      description={`${restaurant.slug}.kendisepetim.com menusu`}
    >
      <TenantMenuClient
        tenantSlug={restaurant.slug}
        categories={categories}
        products={products}
      />
    </PageShell>
  );
}
