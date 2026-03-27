import {
  createProduct,
  getDashboardCategoriesForCurrentRestaurant,
  getDashboardProductsForCurrentRestaurant,
  toggleProductActive,
  updateProduct,
} from "../../../../features/menu";

export default async function DashboardProductsPage() {
  const [categories, products] = await Promise.all([
    getDashboardCategoriesForCurrentRestaurant(),
    getDashboardProductsForCurrentRestaurant(),
  ]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-600">
          Urunlerinizi, fiyatlarinizi ve menu gorunurlugunu bu bolumde yonetin.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Yeni Urun</h2>
        {categories.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">
            Urun eklemek icin once en az bir kategori olusturmalisiniz.
          </p>
        ) : (
          <form action={createProduct} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              name="name"
              placeholder="Urun adi"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              name="category_id"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Kategori secin
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              name="description"
              placeholder="Aciklama"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Fiyat"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              name="image_url"
              type="url"
              placeholder="Gorsel URL (opsiyonel)"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={0}
              placeholder="Siralama"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white md:w-fit"
            >
              Urun Ekle
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Urun Listesi</h2>

        {products.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Henuz urun bulunmuyor.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="grid gap-3">
                  <form action={updateProduct} className="grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="product_id" value={product.id} />
                    <input
                      name="name"
                      defaultValue={product.name}
                      required
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      name="category_id"
                      required
                      defaultValue={product.category_id}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="description"
                      defaultValue={product.description ?? ""}
                      placeholder="Aciklama"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                    />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={product.price}
                      required
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="image_url"
                      type="url"
                      defaultValue={product.image_url ?? ""}
                      placeholder="Gorsel URL"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={product.sort_order}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 md:w-fit"
                    >
                      Kaydet
                    </button>
                  </form>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Durum: {product.is_active ? "Aktif" : "Pasif"}
                    </p>
                    <form action={toggleProductActive}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input
                        type="hidden"
                        name="next_active"
                        value={product.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={`rounded-md px-3 py-2 text-sm font-medium text-white ${
                          product.is_active ? "bg-red-700" : "bg-green-700"
                        }`}
                      >
                        {product.is_active ? "Pasife Al" : "Aktife Al"}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
