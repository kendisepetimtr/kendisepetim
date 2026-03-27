import { getCurrentRestaurantContext, updateRestaurantSettings } from "../../../../features/tenants";

export default async function DashboardSettingsPage() {
  const context = await getCurrentRestaurantContext();
  if (!context) {
    throw new Error("Unauthorized");
  }

  const { restaurant } = context;

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Restoran profili ve temel operasyon ayarlarinizi bu bolumden yonetin.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Restoran Bilgileri</h2>
        <form action={updateRestaurantSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
              Restoran adi
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={restaurant.name}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="logo_url">
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={restaurant.logo_url ?? ""}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
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
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Ayarlari Kaydet
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
