import { getCurrentRestaurantContext, updateRestaurantSettings } from "../../../../features/tenants";
import { RestaurantContactControls } from "./restaurant-contact-controls";

export default async function DashboardSettingsPage() {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const { restaurant } = context;

  return (
    <section className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Restoran bilgileri</h2>
        <p className="mt-1 text-xs text-gray-500">
          Menü görünümü için üst şeritteki <span className="font-medium text-gray-700">Tema</span> sekmesine
          geçin.
        </p>
        <form action={updateRestaurantSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
              Restoran Adı
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={restaurant.name}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Türkçe karakterler desteklenir.</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="description">
              Restoran Açıklaması
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={restaurant.description ?? ""}
              placeholder="Örn: Günlük taze ürünlerle lezzetli menü."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Bu metin menüde slogan olarak kullanılır.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="waiter_pin">
              Garson PIN (4 hane)
            </label>
            <input
              id="waiter_pin"
              name="waiter_pin"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              defaultValue={restaurant.waiter_pin ?? ""}
              placeholder="1234"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="table_count">
              Masa Sayısı
            </label>
            <input
              id="table_count"
              name="table_count"
              type="number"
              min={1}
              max={200}
              defaultValue={restaurant.table_count ?? 10}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="admin_username">
              Restoran Admin Kullanıcı Adı
            </label>
            <input
              id="admin_username"
              name="admin_username"
              defaultValue={restaurant.admin_username ?? ""}
              placeholder="örn: burger34admin"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              <span className="font-mono">{`/t/${restaurant.slug}/admin`}</span> girişi için kullanılır.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="admin_password">
              Restoran Admin Şifre
            </label>
            <input
              id="admin_password"
              name="admin_password"
              type="password"
              placeholder="Boş bırakılırsa değişmez"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">En az 4 karakter.</p>
          </div>

          <div className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">Logo</span>
            <p className="mb-2 text-xs text-gray-500">
              JPEG, PNG, WebP veya GIF; en fazla 2 MB. Yükleme Supabase Storage üzerindedir.
            </p>
            <div className="flex flex-wrap items-start gap-4 rounded-md border border-dashed border-gray-200 bg-gray-50/80 p-3">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurant.logo_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 bg-white object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-[10px] text-gray-400">
                  Logo yok
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full text-xs text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
                />
                {restaurant.logo_url ? (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" name="remove_logo" value="true" />
                    Logoyu kaldır
                  </label>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-gray-700"
              htmlFor="brand_color"
            >
              Brand color
            </label>
            <input
              id="brand_color"
              name="brand_color"
              defaultValue={restaurant.brand_color ?? "#111827"}
              placeholder="#111827"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="is_active"
                value="true"
                defaultChecked={restaurant.is_active}
                className="h-4 w-4 rounded border-gray-300"
              />
              Restoran aktif
            </label>
          </div>

          <div className="md:col-span-2">
            <RestaurantContactControls
              defaultCallEnabled={restaurant.fab_call_enabled}
              defaultCallPhone={restaurant.fab_call_phone}
              defaultWhatsappEnabled={restaurant.fab_whatsapp_enabled}
              defaultWhatsappPhone={restaurant.fab_whatsapp_phone}
              defaultLocationEnabled={restaurant.fab_location_enabled}
              defaultLocationLat={restaurant.fab_location_lat}
              defaultLocationLng={restaurant.fab_location_lng}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Ayarları Kaydet
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
