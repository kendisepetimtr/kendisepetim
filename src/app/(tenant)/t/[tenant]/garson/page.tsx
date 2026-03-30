import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getRestaurantBySlug } from "../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../lib/tenant";

type WaiterPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function TenantWaiterPage({ params, searchParams }: WaiterPageProps) {
  const { tenant } = await params;
  const normalizedTenant = normalizeTenantSlug(tenant);
  const resolvedSearch = searchParams ? await searchParams : {};

  if (!isValidTenantSlug(normalizedTenant)) notFound();

  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  const waiterKey = `waiter_access_${restaurant.slug}`;
  const waiterAllowed = cookieStore.get(waiterKey)?.value === "1";

  async function loginWaiter(formData: FormData) {
    "use server";
    const pin = String(formData.get("pin") ?? "").trim();
    const tenantSlug = String(formData.get("tenant_slug") ?? "").trim();
    const targetRestaurant = await getRestaurantBySlug(tenantSlug, { storefront: true });
    if (!targetRestaurant) redirect(`/t/${tenantSlug}/garson?error=restoran`);
    if (!targetRestaurant.waiter_pin) {
      redirect(`/t/${tenantSlug}/garson?error=pin_tanimli_degil`);
    }
    if (pin !== targetRestaurant.waiter_pin) {
      redirect(`/t/${tenantSlug}/garson?error=pin_hatali`);
    }

    const c = await cookies();
    c.set(`waiter_access_${targetRestaurant.slug}`, "1", {
      path: `/t/${targetRestaurant.slug}`,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
    });
    redirect(`/t/${targetRestaurant.slug}/garson`);
  }

  if (!waiterAllowed) {
    const err = resolvedSearch.error;
    const msg =
      err === "pin_hatali"
        ? "PIN hatalı."
        : err === "pin_tanimli_degil"
          ? "Restoran için garson PIN tanımlanmamış."
          : null;
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h1 className="text-lg font-semibold text-gray-900">Garson Girişi</h1>
          <p className="mt-1 text-sm text-gray-600">{restaurant.name}</p>
          {msg ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null}
          <form action={loginWaiter} className="mt-4 space-y-3">
            <input type="hidden" name="tenant_slug" value={restaurant.slug} />
            <input
              name="pin"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              placeholder="4 haneli PIN"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <button type="submit" className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              Giriş Yap
            </button>
          </form>
        </section>
      </main>
    );
  }

  const tableCount = Math.max(1, Math.min(200, restaurant.table_count ?? 10));
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-lg font-semibold text-gray-900">Masalar</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
