import {
  createCategory,
  getDashboardCategoriesForCurrentRestaurant,
  toggleCategoryActive,
  updateCategory,
} from "../../../../features/menu";

export default async function DashboardCategoriesPage() {
  const categories = await getDashboardCategoriesForCurrentRestaurant();

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Categories</h1>
        <p className="mt-1 text-sm text-gray-600">
          Restoran menu kategorilerinizi bu bolumden yonetin.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Yeni Kategori</h2>
        <form action={createCategory} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            name="name"
            placeholder="Kategori adi"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="Aciklama (opsiyonel)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="sort_order"
            type="number"
            defaultValue={0}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white md:col-span-4 md:w-fit"
          >
            Kategori Ekle
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Kategori Listesi</h2>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Henuz kategori bulunmuyor.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {categories.map((category) => (
              <article
                key={category.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <form action={updateCategory} className="grid flex-1 gap-2 md:grid-cols-4">
                    <input type="hidden" name="category_id" value={category.id} />
                    <input
                      name="name"
                      defaultValue={category.name}
                      required
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="description"
                      defaultValue={category.description ?? ""}
                      placeholder="Aciklama"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={category.sort_order}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 md:w-fit"
                    >
                      Guncelle
                    </button>
                  </form>

                  <form action={toggleCategoryActive}>
                    <input type="hidden" name="category_id" value={category.id} />
                    <input
                      type="hidden"
                      name="next_active"
                      value={category.is_active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={`rounded-md px-3 py-2 text-sm font-medium text-white lg:ml-3 ${
                        category.is_active ? "bg-red-700" : "bg-green-700"
                      }`}
                    >
                      {category.is_active ? "Pasife Al" : "Aktife Al"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
