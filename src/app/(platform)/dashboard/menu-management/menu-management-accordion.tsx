"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { effectiveOnlinePrice } from "../../../../types";
import type { Category, Product } from "../../../../types";
import {
  deleteCategory,
  reorderCategories,
  toggleCategoryActive,
  updateCategory,
} from "../../../../features/menu/category-actions";
import {
  createProduct,
  deleteProduct,
  reorderProductsInCategory,
  toggleProductActive,
  updateProduct,
} from "../../../../features/menu/product-actions";

type Props = {
  categories: Category[];
  products: Product[];
};

function sortCategories(list: Category[]) {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

function sortProducts(list: Product[]) {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

function SortableProductCard({ product, categoryId }: { product: Product; categoryId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });
  const [useDeliveryPrice, setUseDeliveryPrice] = useState(product.use_delivery_price);
  useEffect(() => {
    setUseDeliveryPrice(product.use_delivery_price);
  }, [product.use_delivery_price]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  };

  const ingredientsDefault = product.ingredients?.length ? product.ingredients.join("\n") : "";
  const menuPriceLabel = effectiveOnlinePrice(product);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-1 shrink-0 cursor-grab touch-none rounded border border-gray-200 bg-gray-50 px-1.5 py-2 text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Ürünü sürükleyerek sırala"
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs text-gray-500">
            Online menüde gösterilen fiyat:{" "}
            <span className="font-medium text-gray-700">
              {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
                menuPriceLabel,
              )}
            </span>
          </p>
          <form action={updateProduct} className="flex flex-col gap-2">
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="category_id" value={categoryId} />
            <input type="hidden" name="sort_order" value={product.sort_order} />
            <input
              name="name"
              defaultValue={product.name}
              required
              placeholder="Ürün adı"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              defaultValue={product.description ?? ""}
              placeholder="Açıklama"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              name="ingredients"
              defaultValue={ingredientsDefault}
              placeholder="İçindekiler — her satırda bir madde"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="use_delivery_price"
                value="true"
                checked={useDeliveryPrice}
                onChange={(e) => setUseDeliveryPrice(e.target.checked)}
              />
              Paket / online için ayrı fiyat kullan
            </label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.price}
              required
              placeholder="Liste / salon fiyatı"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {useDeliveryPrice ? (
              <input
                name="delivery_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.delivery_price ?? ""}
                required
                placeholder="Paket / online fiyatı (menüde bu gösterilir)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            ) : null}
            <div className="flex flex-wrap items-start gap-3 rounded-md border border-dashed border-gray-200 bg-gray-50/80 p-2">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="text-xs text-gray-500">Görsel yok</span>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full text-xs text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
                />
                {product.image_url ? (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" name="remove_image" value="true" />
                    Mevcut görseli kaldır
                  </label>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              className="w-fit rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              Kaydet
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
            <form action={toggleProductActive} className="inline">
              <input type="hidden" name="product_id" value={product.id} />
              <input
                type="hidden"
                name="next_active"
                value={product.is_active ? "false" : "true"}
              />
              <button
                type="submit"
                className={`rounded-md px-3 py-2 text-sm font-medium text-white ${
                  product.is_active ? "bg-red-700 hover:bg-red-800" : "bg-green-700 hover:bg-green-800"
                }`}
              >
                {product.is_active ? "Ürün pasife al" : "Ürün aktife al"}
              </button>
            </form>
            <form
              action={deleteProduct}
              className="inline"
              onSubmit={(e) => {
                if (
                  !confirm(`"${product.name}" ürünü kalıcı olarak silinecek. Emin misiniz?`)
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="product_id" value={product.id} />
              <button
                type="submit"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Kaldır
              </button>
            </form>
          </div>
        </div>
      </div>
    </li>
  );
}

function AddProductForm({ categoryId }: { categoryId: string }) {
  const [useDeliveryPrice, setUseDeliveryPrice] = useState(false);

  return (
    <form action={createProduct} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="category_id" value={categoryId} />
      <input
        name="name"
        placeholder="Ürün adı"
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        placeholder="Açıklama"
        rows={2}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <textarea
        name="ingredients"
        placeholder="İçindekiler — her satırda bir madde"
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="use_delivery_price"
          value="true"
          checked={useDeliveryPrice}
          onChange={(e) => setUseDeliveryPrice(e.target.checked)}
        />
        Paket / online için ayrı fiyat kullan
      </label>
      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Liste / salon fiyatı"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {useDeliveryPrice ? (
        <input
          name="delivery_price"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Paket / online fiyatı"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      ) : null}
      <input
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="w-full text-xs text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
      />
      <button
        type="submit"
        className="w-fit rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
      >
        Ürün ekle
      </button>
    </form>
  );
}

type SortableCategoryBlockProps = {
  category: Category;
  displayIndex: number;
  open: boolean;
  onToggle: () => void;
  categoryProducts: Product[];
  productSensors: ReturnType<typeof useSensors>;
  onProductDragEnd: (categoryId: string, products: Product[], e: DragEndEvent) => void;
};

function SortableCategoryBlock({
  category,
  displayIndex,
  open,
  onToggle,
  categoryProducts,
  productSensors,
  onProductDragEnd,
}: SortableCategoryBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  };

  const productIds = useMemo(() => categoryProducts.map((p) => p.id), [categoryProducts]);

  return (
    <li ref={setNodeRef} style={style} className="bg-white">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded border border-gray-200 bg-gray-50 px-1.5 py-2 text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Kategoriyi sürükleyerek sırala"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-gray-900"
          aria-expanded={open}
        >
          <span className="text-gray-400" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span className="font-medium">
            <span className="text-gray-500">{displayIndex}.</span> {category.name}
          </span>
          {!category.is_active ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Pasif
            </span>
          ) : null}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleCategoryActive}>
            <input type="hidden" name="category_id" value={category.id} />
            <input
              type="hidden"
              name="next_active"
              value={category.is_active ? "false" : "true"}
            />
            <button
              type="submit"
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
                category.is_active ? "bg-red-700 hover:bg-red-800" : "bg-green-700 hover:bg-green-800"
              }`}
            >
              {category.is_active ? "Kategori pasife al" : "Kategori aktife al"}
            </button>
          </form>
          <form
            action={deleteCategory}
            onSubmit={(e) => {
              if (
                !confirm(
                  `"${category.name}" kategorisi ve içindeki tüm ürünler kalıcı olarak silinecek. Emin misiniz?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="category_id" value={category.id} />
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Kaldır
            </button>
          </form>
        </div>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-gray-100 bg-gray-50/80 px-3 py-4 sm:px-4">
          <form action={updateCategory} className="grid gap-2 md:grid-cols-3">
            <input type="hidden" name="category_id" value={category.id} />
            <input type="hidden" name="sort_order" value={category.sort_order} />
            <input
              name="name"
              defaultValue={category.name}
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <input
              name="description"
              defaultValue={category.description ?? ""}
              placeholder="Açıklama"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 md:col-span-3 md:w-fit"
            >
              Kategoriyi güncelle
            </button>
          </form>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Bu kategoriye ürün ekle</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Yeni ürün listenin en üstüne eklenir; sırayı sürükleyerek değiştirebilirsiniz.
            </p>
            <AddProductForm categoryId={category.id} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Ürünler</h3>
            {categoryProducts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">Bu kategoride henüz ürün yok.</p>
            ) : (
              <DndContext
                id={`menu-products-${category.id}`}
                sensors={productSensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => onProductDragEnd(category.id, categoryProducts, e)}
              >
                <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
                  <ul className="mt-3 space-y-3">
                    {categoryProducts.map((product) => (
                      <SortableProductCard
                        key={product.id}
                        product={product}
                        categoryId={category.id}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function MenuManagementAccordion({ categories, products }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sortedCategories = useMemo(() => sortCategories(categories), [categories]);

  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (openId && !sortedCategories.some((c) => c.id === openId)) {
      setOpenId(null);
    }
  }, [sortedCategories, openId]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      if (!map[p.category_id]) map[p.category_id] = [];
      map[p.category_id]!.push(p);
    }
    for (const id of Object.keys(map)) {
      map[id] = sortProducts(map[id]!);
    }
    return map;
  }, [products]);

  const categoryIds = useMemo(() => sortedCategories.map((c) => c.id), [sortedCategories]);

  const categorySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const productSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = [...categoryIds];
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(ids, oldIndex, newIndex);
    startTransition(async () => {
      try {
        await reorderCategories(nextOrder);
        router.refresh();
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Sıralama kaydedilemedi.");
      }
    });
  }

  function handleProductDragEnd(categoryId: string, categoryProducts: Product[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = categoryProducts.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(ids, oldIndex, newIndex);
    startTransition(async () => {
      try {
        await reorderProductsInCategory(categoryId, nextOrder);
        router.refresh();
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Ürün sırası kaydedilemedi.");
      }
    });
  }

  if (sortedCategories.length === 0) {
    return <p className="mt-4 text-sm text-gray-600">Henüz kategori bulunmuyor.</p>;
  }

  return (
    <div className="relative mt-4">
      {isPending ? (
        <p className="mb-2 text-xs text-gray-500" aria-live="polite">
          Sıralama kaydediliyor…
        </p>
      ) : null}
      <p className="mb-3 text-xs text-gray-500">
        Kategori ve ürün sırası: sol <span className="font-mono">⠿</span> tutamacından sürükleyin. Müşteri menüsü aynı sırayı kullanır.
      </p>
      <DndContext
        id="menu-categories"
        sensors={categorySensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {sortedCategories.map((category, catIndex) => (
              <SortableCategoryBlock
                key={category.id}
                category={category}
                displayIndex={catIndex + 1}
                open={openId === category.id}
                onToggle={() => setOpenId((id) => (id === category.id ? null : category.id))}
                categoryProducts={productsByCategory[category.id] ?? []}
                productSensors={productSensors}
                onProductDragEnd={handleProductDragEnd}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
