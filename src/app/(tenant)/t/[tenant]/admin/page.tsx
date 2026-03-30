import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { scryptSync, timingSafeEqual } from "crypto";
import { createAnonServerSupabaseClient, createServerSupabaseClient } from "../../../../../lib/supabase";
import { getRestaurantBySlug } from "../../../../../features/tenants";
import { isValidTenantSlug, normalizeTenantSlug } from "../../../../../lib/tenant";

type TenantAdminPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function verifyPassword(plainText: string, hashPayload: string): boolean {
  const [salt, digest] = hashPayload.split(":");
  if (!salt || !digest) return false;
  const actual = scryptSync(plainText, salt, 64).toString("hex");
  const actualBuf = Buffer.from(actual, "hex");
  const digestBuf = Buffer.from(digest, "hex");
  if (actualBuf.length !== digestBuf.length) return false;
  return timingSafeEqual(actualBuf, digestBuf);
}

function adminCookieKey(slug: string): string {
  return `tenant_admin_${slug}`;
}

async function loginTenantAdmin(formData: FormData) {
  "use server";

  const tenantSlug = normalizeTenantSlug(String(formData.get("tenant_slug") ?? ""));
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!isValidTenantSlug(tenantSlug)) {
    redirect(`/`);
  }

  const supabase = createAnonServerSupabaseClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("slug, admin_username, admin_password_hash")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .maybeSingle<{
      slug: string;
      admin_username: string | null;
      admin_password_hash: string | null;
    }>();

  if (error || !data) {
    redirect(`/t/${tenantSlug}/admin?error=` + encodeURIComponent("Restoran bulunamadı."));
  }

  if (!data.admin_username || !data.admin_password_hash) {
    redirect(
      `/t/${tenantSlug}/admin?error=` + encodeURIComponent("Admin kullanıcı bilgisi henüz tanımlanmamış."),
    );
  }

  if (username !== data.admin_username || !verifyPassword(password, data.admin_password_hash)) {
    redirect(`/t/${tenantSlug}/admin?error=` + encodeURIComponent("Kullanıcı adı veya şifre hatalı."));
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookieKey(tenantSlug), "1", {
    path: `/t/${tenantSlug}`,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
  });

  redirect(`/t/${tenantSlug}/admin`);
}

async function logoutTenantAdmin(formData: FormData) {
  "use server";
  const tenantSlug = normalizeTenantSlug(String(formData.get("tenant_slug") ?? ""));
  const cookieStore = await cookies();
  cookieStore.delete(adminCookieKey(tenantSlug));
  redirect(`/t/${tenantSlug}/admin`);
}

export default async function TenantAdminPage({ params, searchParams }: TenantAdminPageProps) {
  const { tenant } = await params;
  const normalizedTenant = normalizeTenantSlug(tenant);
  const resolvedSearch = searchParams ? await searchParams : {};
  const error = resolvedSearch.error;

  if (!isValidTenantSlug(normalizedTenant)) notFound();
  const restaurant = await getRestaurantBySlug(normalizedTenant, { storefront: true });
  if (!restaurant) notFound();

  const cookieStore = await cookies();
  const isAdminLogged = cookieStore.get(adminCookieKey(restaurant.slug))?.value === "1";

  if (!isAdminLogged) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h1 className="text-lg font-semibold text-gray-900">Restoran Admin Girişi</h1>
          <p className="mt-1 text-sm text-gray-600">{restaurant.name}</p>
          {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <form action={loginTenantAdmin} className="mt-4 space-y-3">
            <input type="hidden" name="tenant_slug" value={restaurant.slug} />
            <input
              name="username"
              placeholder="Kullanıcı adı"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Şifre"
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

  const supabase = await createServerSupabaseClient();
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id);
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .in("status", ["pending", "confirmed", "preparing"]);
  const { count: completedOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .in("status", ["ready", "delivered"]);
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, customer_name, total, status, order_channel, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const tableCount = Math.max(1, Math.min(200, restaurant.table_count ?? 10));
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Restoran Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">{restaurant.name}</p>
          </div>
          <form action={logoutTenantAdmin}>
            <input type="hidden" name="tenant_slug" value={restaurant.slug} />
            <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700">
              Çıkış
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Toplam Sipariş</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Aktif Sipariş</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{pendingOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Tamamlanan</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{completedOrders ?? 0}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Masalar</h2>
              <Link href={`/t/${restaurant.slug}/masalar`} className="text-xs text-gray-600 underline">
                Masalar ekranına git
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {tables.map((tableNo) => (
                <Link
                  key={tableNo}
                  href={`/t/${restaurant.slug}/checkout?mode=table&table=${tableNo}`}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-sm font-medium text-gray-800 hover:border-gray-500"
                >
                  Masa {tableNo}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Son Siparişler</h2>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Müşteri</th>
                    <th className="px-3 py-2">Tutar</th>
                    <th className="px-3 py-2">Kanal</th>
                    <th className="px-3 py-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentOrders ?? []).map((row) => {
                    const r = row as {
                      id: string;
                      customer_name: string | null;
                      total: number;
                      order_channel: string | null;
                      status: string;
                    };
                    return (
                      <tr key={r.id} className="border-t border-gray-200 text-gray-700">
                        <td className="px-3 py-2">{r.customer_name ?? "-"}</td>
                        <td className="px-3 py-2">{Number(r.total ?? 0).toFixed(2)} TL</td>
                        <td className="px-3 py-2">{r.order_channel ?? "-"}</td>
                        <td className="px-3 py-2">{r.status}</td>
                      </tr>
                    );
                  })}
                  {recentOrders && recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                        Sipariş bulunamadı.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
