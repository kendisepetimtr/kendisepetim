import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../lib/tenant";

type TenantTablesPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function TenantTablesPage({ params }: TenantTablesPageProps) {
  const { tenant } = await params;
  const normalizedTenant = normalizeTenantSlug(tenant);

  if (!isValidTenantSlug(normalizedTenant)) notFound();

  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) notFound();

  const tableCount = Math.max(1, Math.min(200, restaurant.table_count ?? 10));
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-lg font-semibold text-gray-900">Masa Sipariş Ekranı</h1>
        <p className="mt-1 text-sm text-gray-600">
          Masa seçerek sipariş başlatın veya paket sipariş ekranına geçin.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/t/${restaurant.slug}/checkout?mode=package`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Paket Sipariş Başlat
          </Link>
          <Link href={`/t/${restaurant.slug}`} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Menüye Dön
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((tableNo) => (
            <Link
              key={tableNo}
              href={`/t/${restaurant.slug}/checkout?mode=table&table=${tableNo}`}
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-4 text-center text-sm font-medium text-gray-800 hover:border-gray-500 hover:bg-white"
            >
              Masa {tableNo}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
