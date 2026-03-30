import { notFound } from "next/navigation";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../lib/tenant";
import {
  getActiveProductsByRestaurantId,
  getCategoriesByRestaurantId,
} from "../../../../features/menu/server";
import { getRestaurantBySlug } from "../../../../features/tenants";
import { menuThemeFromRestaurant } from "../../../../lib/tenant-menu-theme";
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

  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) {
    notFound();
  }

  const [categories, products] = await Promise.all([
    getCategoriesByRestaurantId(restaurant.id, { storefront: true }),
    getActiveProductsByRestaurantId(restaurant.id, { storefront: true }),
  ]);

  return (
    <main className="w-full min-h-[100dvh]">
      <h1 className="sr-only">{restaurant.name}</h1>
      <TenantMenuClient
        tenantSlug={restaurant.slug}
        categories={categories}
        products={products}
        menuTheme={menuThemeFromRestaurant(restaurant)}
      />
    </main>
  );
}
