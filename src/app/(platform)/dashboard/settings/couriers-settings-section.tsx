import { createCourier, deactivateCourier, getCouriersForCurrentRestaurant } from "../../../../features/couriers";

export async function CouriersSettingsSection() {
  let couriers: Awaited<ReturnType<typeof getCouriersForCurrentRestaurant>> = [];
  try {
    couriers = await getCouriersForCurrentRestaurant();
  } catch {
    couriers = [];
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">Kuryeler</h2>
      <p className="mt-1 text-xs text-gray-500">
        Paket veya online teslimat siparişlerini kapatırken hangi kuryenin ödemeyi aldığını seçmek için kullanılır.
      </p>

      {couriers.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {couriers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">
                  {c.first_name} {c.last_name}
                </span>
                {c.phone ? <span className="text-gray-600"> · {c.phone}</span> : null}
                {c.pos_number ? (
                  <span className="text-gray-500"> · POS: {c.pos_number}</span>
                ) : null}
              </span>
              <form action={deactivateCourier}>
                <input type="hidden" name="courier_id" value={c.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-rose-600 underline hover:text-rose-500"
                >
                  Pasifleştir
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-600">Henüz kurye eklenmemiş.</p>
      )}

      <form action={createCourier} className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="c_first_name">
            Ad
          </label>
          <input
            id="c_first_name"
            name="first_name"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="c_last_name">
            Soyad
          </label>
          <input
            id="c_last_name"
            name="last_name"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="c_phone">
            Telefon
          </label>
          <input
            id="c_phone"
            name="phone"
            inputMode="tel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="c_pos">
            POS numarası
          </label>
          <input id="c_pos" name="pos_number" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            Kurye ekle
          </button>
        </div>
      </form>
    </section>
  );
}
