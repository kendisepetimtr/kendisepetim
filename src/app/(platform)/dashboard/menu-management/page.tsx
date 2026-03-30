import {
  createCategory,
  getDashboardCategoriesForCurrentRestaurant,
  getDashboardProductsForCurrentRestaurant,
} from "../../../../features/menu/server";
import { MenuManagementAccordion } from "./menu-management-accordion";

export default async function DashboardMenuManagementPage() {
  const [categories, products] = await Promise.all([
    getDashboardCategoriesForCurrentRestaurant(),
    getDashboardProductsForCurrentRestaurant(),
  ]);

  const sortedCategories = [...categories].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });

  return (
    <section className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Yeni Kategori</h2>
        <p className="mt-1 text-xs text-gray-500">
          Yeni kategori listenin en üstüne eklenir; sırayı aşağıda sürükleyerek değiştirebilirsiniz.
        </p>
        <form action={createCategory} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            name="name"
            placeholder="Kategori adı"
            required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="description"
            placeholder="Açıklama (opsiyonel)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm md:col-span-2"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white md:col-span-3 md:w-fit"
          >
            Kategori Ekle
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Menü Yönetimi</h2>
        <p className="mt-1 text-sm text-gray-500">
          Kategoriler ve ürünler sürükleyerek sıralanır; başlığa tıklayarak kategori detayını açıp
          kapatabilirsiniz.
        </p>

        <MenuManagementAccordion categories={sortedCategories} products={products} />
      </section>
    </section>
  );
}
