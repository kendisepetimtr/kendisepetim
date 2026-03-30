import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import {
  getSuperadminEmail,
  isSuperadminSession,
  SUPERADMIN_SESSION_COOKIE,
} from "../../../../lib/admin/superadmin";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  table_count: number | null;
  created_at: string;
};

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function updateRestaurantAction(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  if (!isSuperadminSession(cookieStore.get(SUPERADMIN_SESSION_COOKIE)?.value)) {
    redirect("/superadmin-login?error=" + encodeURIComponent("Oturum süresi doldu."));
  }

  const supabase = await createServerSupabaseClient();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "") === "on";

  if (!id || !name) {
    throw new Error("Restoran kaydı için zorunlu alanlar eksik.");
  }

  const slug = normalizeSlug(slugRaw);
  if (!slug || slug.length < 2) {
    throw new Error("Slug en az 2 karakter olmalı.");
  }

  const updatePayload: Record<string, string | boolean> = {
    name,
    slug,
    is_active: isActive,
  };

  const { error } = await supabase.from("restaurants").update(updatePayload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/restaurants");
}

export default async function SuperadminRestaurantsPage() {
  const cookieStore = await cookies();
  if (!isSuperadminSession(cookieStore.get(SUPERADMIN_SESSION_COOKIE)?.value)) {
    redirect("/superadmin-login?error=" + encodeURIComponent("Superadmin girisi gerekli."));
  }

  const supabase = await createServerSupabaseClient();

  const { count: restaurantCount, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true });

  const { count: memberCount, error: memberError } = await supabase
    .from("restaurant_members")
    .select("id", { count: "exact", head: true });

  const { data: memberRows, error: usersError } = await supabase
    .from("restaurant_members")
    .select("user_id")
    .eq("is_active", true);
  const uniqueUsers = usersError
    ? null
    : new Set((memberRows ?? []).map((r) => String((r as { user_id: string }).user_id))).size;

  const { count: orderTotalCount, error: orderTotalError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("id,name,slug,is_active,table_count,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Restoranlar</h1>
        <p className="mt-1 text-sm text-slate-400">
          Oturum: <span className="text-slate-200">{getSuperadminEmail()}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Restoranlar</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {restaurantError ? "—" : (restaurantCount ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Uyelikler</p>
          <p className="mt-2 text-2xl font-semibold text-white">{memberError ? "—" : (memberCount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Benzersiz Kullanıcı</p>
          <p className="mt-2 text-2xl font-semibold text-white">{usersError ? "—" : (uniqueUsers ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Sipariş</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {orderTotalError ? "—" : (orderTotalCount ?? 0)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Restoran Düzenle</h2>
        {restaurantsError ? (
          <p className="mt-2 text-sm text-rose-400">{restaurantsError.message}</p>
        ) : !restaurants || restaurants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Kayıt bulunamadı.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {(restaurants as RestaurantRow[]).map((r) => (
              <form
                key={r.id}
                action={updateRestaurantAction}
                className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="id" value={r.id} />
                <label className="text-xs text-slate-400">
                  Restoran Adı
                  <input
                    name="name"
                    defaultValue={r.name}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Slug
                  <input
                    name="slug"
                    defaultValue={r.slug}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
                  />
                </label>
                <label className="mt-5 inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={r.is_active}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                  />
                  Aktif
                </label>
                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-500"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
