import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveProductsByRestaurantId, getCategoriesByRestaurantId } from "../../../../../../features/menu/server";
import { getRestaurantBySlug } from "../../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../../lib/tenant";
import { WaiterTableOrderClient } from "./waiter-table-order-client";

type GarsonSiparisPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ table?: string }>;
};

export default async function GarsonSiparisPage({ params, searchParams }: GarsonSiparisPageProps) {
  const { tenant } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const slug = normalizeTenantSlug(tenant);

  if (!isValidTenantSlug(slug)) notFound();

  const restaurant = await getRestaurantBySlug(slug, { storefront: true });
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  if (cookieStore.get(`waiter_access_${restaurant.slug}`)?.value !== "1") {
    redirect(`/t/${restaurant.slug}/garson`);
  }

  const tableRaw = String(resolvedSearch.table ?? "").trim();
  if (!tableRaw || !/^\d+$/.test(tableRaw)) {
    redirect(`/t/${restaurant.slug}/garson`);
  }

  const [categories, products] = await Promise.all([
    getCategoriesByRestaurantId(restaurant.id, { storefront: true }),
    getActiveProductsByRestaurantId(restaurant.id, { storefront: true }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <WaiterTableOrderClient
        tenantSlug={restaurant.slug}
        tableNumber={tableRaw}
        restaurantName={restaurant.name}
        categories={categories}
        products={products}
      />
      <p className="mt-4 text-center text-xs text-gray-500">
        <Link href={`/t/${restaurant.slug}`} className="underline">
          Müşteri menüsü
        </Link>
      </p>
    </main>
  );
}
