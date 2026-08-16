"use client";

import type { LocalMenuCategory } from "@/lib/local-menu";
import LanguageAddStub from "@/components/dashboard/language-add-stub";
import { type FormEvent, useEffect, useId, useState } from "react";

export type CategoryEditFields = {
  name: string;
  description: string;
  sortOrder: number;
};

type CategoryEditModalProps = {
  open: boolean;
  onClose: () => void;
  category: LocalMenuCategory | null;
  onSave: (id: string, fields: CategoryEditFields) => void;
};

export default function CategoryEditModal({ open, onClose, category, onSave }: CategoryEditModalProps) {
  const baseId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (!open || !category) return;
    setName(category.name);
    setDescription(category.description);
    setSortOrder(String(category.sortOrder));
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category) return;
    const n = name.trim();
    if (!n) return;
    const raw = sortOrder.trim().replace(",", ".");
    const ord = Number.parseInt(raw, 10);
    const sort = Number.isFinite(ord) ? ord : 0;
    onSave(category.id, {
      name: n,
      description: description.trim(),
      sortOrder: sort,
    });
    onClose();
  }

  if (!open || !category) return null;

  return (
    <div className="fixed inset-0 z-[185] flex items-end justify-center p-4 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl"
      >
        <div className="border-b border-surface-container-high px-5 py-4">
          <h2 id={`${baseId}-title`} className="font-headline text-lg font-bold text-on-background">
            Kategoriyi düzenle
          </h2>
          <p className="mt-1 text-xs text-secondary">
            Ad, QR menüdeki sıra ve isteğe bağlı açıklama. Gizleme ve silme kart üzerindeki düğmelerdedir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-name`}>
                  Kategori adı
                </label>
                <input
                  id={`${baseId}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <LanguageAddStub />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-order`}>
                  QR menü sırası
                </label>
                <input
                  id={`${baseId}-order`}
                  type="text"
                  inputMode="numeric"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="mt-1 w-full max-w-[200px] rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-[11px] text-secondary">
                  Küçük sayı üstte ve sekmede önce görünür (ör. 1, 2, 10). Aynı sayıda olanlar ada göre sıralanır.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-desc`}>
                  Kategori açıklaması <span className="font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  id={`${baseId}-desc`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="QR menüde bu kategori seçildiğinde ürün listesinin üstünde gösterilir."
                  className="mt-1 w-full resize-y rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <LanguageAddStub />
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-surface-container-high bg-surface-container-low/50 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-surface-container-highest bg-white py-3 text-sm font-semibold text-on-background hover:bg-surface-container-low"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-container"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
