"use client";

import {
  type LocalMenuCategory,
  type LocalMenuProduct,
} from "@/lib/local-menu";
import {
  CUSTOM_WARNING_ICON_OPTIONS,
  DEFAULT_CUSTOM_WARNING_ICON,
  MAX_CUSTOM_PRODUCT_WARNINGS,
  MAX_CUSTOM_WARNING_DESCRIPTION_LENGTH,
  MAX_CUSTOM_WARNING_LABEL_LENGTH,
  MENU_WARNING_PRESETS,
  sanitizeCustomMenuWarnings,
  sanitizeMenuWarningPresetKeys,
  type MenuProductCustomWarning,
} from "@/lib/menu-product-warnings";
import {
  MAX_OPTIONS_PER_GROUP,
  MAX_VARIATION_GROUPS,
  MAX_VARIATION_GROUP_NAME_LENGTH,
  MAX_VARIATION_OPTION_LABEL_LENGTH,
  makeVariationId,
  sanitizeVariationGroups,
  type VariationGroup,
  type VariationSelectionType,
} from "@/lib/menu-variations";
import { MAX_MENU_IMAGE_FILE_BYTES, isAllowedMenuImageType } from "@/lib/menu-images";
import { type FormEvent, useEffect, useId, useState } from "react";

type OptionDraft = { id: string; label: string; priceDelta: string };
type GroupDraft = {
  id: string;
  name: string;
  type: VariationSelectionType;
  required: boolean;
  options: OptionDraft[];
};

export type ProductFormFields = {
  categoryId: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  usePackagePrice: boolean;
  packagePrice: number;
  hidden: boolean;
  /** Müşteri menüsünde üstteki büyük alan; tek ürün */
  signatureDish: boolean;
  /** Sepet modalında “İyi gider” önerisi */
  checkoutUpsell: boolean;
  /** Supabase Storage public URL */
  imageDataUrl: string;
  warningPresetKeys: string[];
  customWarnings: MenuProductCustomWarning[];
  variationGroups: VariationGroup[];
};

function variationGroupsToDrafts(groups: VariationGroup[]): GroupDraft[] {
  return groups.map((group) => ({
    id: group.id || makeVariationId(),
    name: group.name,
    type: group.type,
    required: group.required,
    options: group.options.map((option) => ({
      id: option.id || makeVariationId(),
      label: option.label,
      priceDelta: option.priceDelta === 0 ? "" : String(option.priceDelta).replace(".", ","),
    })),
  }));
}

function emptyOptionDraft(): OptionDraft {
  return { id: makeVariationId(), label: "", priceDelta: "" };
}

function emptyGroupDraft(): GroupDraft {
  return {
    id: makeVariationId(),
    name: "",
    type: "single",
    required: true,
    options: [emptyOptionDraft(), emptyOptionDraft()],
  };
}

const MAX_PRODUCT_DESCRIPTION_LENGTH = 280;

type ProductFormModalProps = {
  open: boolean;
  onClose: () => void;
  categories: LocalMenuCategory[];
  mode: "create" | "edit";
  /** create: varsayılan kategori */
  defaultCategoryId: string;
  /** edit: dolu */
  editingProduct: LocalMenuProduct | null;
  onSave: (fields: ProductFormFields, productId?: string) => void | Promise<void>;
};

function parsePriceInput(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export default function ProductFormModal({
  open,
  onClose,
  categories,
  mode,
  defaultCategoryId,
  editingProduct,
  onSave,
}: ProductFormModalProps) {
  const baseId = useId();
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [usePackagePrice, setUsePackagePrice] = useState(false);
  const [packagePrice, setPackagePrice] = useState("");
  const [hidden, setHidden] = useState(false);
  const [signatureDish, setSignatureDish] = useState(false);
  const [checkoutUpsell, setCheckoutUpsell] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [warningPresetKeys, setWarningPresetKeys] = useState<string[]>([]);
  const [customWarnings, setCustomWarnings] = useState<MenuProductCustomWarning[]>([]);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [variationGroups, setVariationGroups] = useState<GroupDraft[]>([]);
  const [variationsOpen, setVariationsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingProduct) {
      setCategoryId(
        categories.some((c) => c.id === editingProduct.categoryId)
          ? editingProduct.categoryId
          : categories[0]?.id ?? "",
      );
      setName(editingProduct.name);
      setDescription(editingProduct.description);
      setIngredients(editingProduct.ingredients);
      setPrice(
        editingProduct.price === 0 ? "" : String(editingProduct.price).replace(".", ","),
      );
      setUsePackagePrice(editingProduct.usePackagePrice);
      setPackagePrice(
        editingProduct.packagePrice === 0
          ? ""
          : String(editingProduct.packagePrice).replace(".", ","),
      );
      setHidden(editingProduct.hidden);
      setSignatureDish(editingProduct.signatureDish);
      setCheckoutUpsell(editingProduct.checkoutUpsell);
      setImageDataUrl(editingProduct.imageDataUrl);
      setWarningPresetKeys(editingProduct.warningPresetKeys);
      setCustomWarnings(editingProduct.customWarnings);
      setWarningsOpen(editingProduct.warningBadges.length > 0);
      setVariationGroups(variationGroupsToDrafts(editingProduct.variationGroups));
      setVariationsOpen(editingProduct.variationGroups.length > 0);
    } else {
      const def =
        categories.some((c) => c.id === defaultCategoryId) ? defaultCategoryId : categories[0]?.id ?? "";
      setCategoryId(def);
      setName("");
      setDescription("");
      setIngredients("");
      setPrice("");
      setUsePackagePrice(false);
      setPackagePrice("");
      setHidden(false);
      setSignatureDish(false);
      setCheckoutUpsell(false);
      setImageDataUrl("");
      setWarningPresetKeys([]);
      setCustomWarnings([]);
      setWarningsOpen(false);
      setVariationGroups([]);
      setVariationsOpen(false);
    }
  }, [open, mode, editingProduct, defaultCategoryId, categories]);

  function togglePresetWarning(key: string) {
    setWarningPresetKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  function updateCustomWarning(index: number, patch: Partial<MenuProductCustomWarning>) {
    setCustomWarnings((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function addCustomWarning() {
    setWarningsOpen(true);
    setCustomWarnings((prev) => [...prev, { label: "", description: "", icon: DEFAULT_CUSTOM_WARNING_ICON }]);
  }

  function removeCustomWarning(index: number) {
    setCustomWarnings((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function addVariationGroup() {
    setVariationsOpen(true);
    setVariationGroups((prev) => [...prev, emptyGroupDraft()]);
  }

  function updateVariationGroup(groupIndex: number, patch: Partial<Omit<GroupDraft, "options" | "id">>) {
    setVariationGroups((prev) =>
      prev.map((group, index) => (index === groupIndex ? { ...group, ...patch } : group)),
    );
  }

  function removeVariationGroup(groupIndex: number) {
    setVariationGroups((prev) => prev.filter((_, index) => index !== groupIndex));
  }

  function addVariationOption(groupIndex: number) {
    setVariationGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex ? { ...group, options: [...group.options, emptyOptionDraft()] } : group,
      ),
    );
  }

  function updateVariationOption(groupIndex: number, optionIndex: number, patch: Partial<Omit<OptionDraft, "id">>) {
    setVariationGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option, oIndex) =>
                oIndex === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    );
  }

  function removeVariationOption(groupIndex: number, optionIndex: number) {
    setVariationGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? { ...group, options: group.options.filter((_, oIndex) => oIndex !== optionIndex) }
          : group,
      ),
    );
  }

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

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedMenuImageType(file.type)) {
      window.alert("Yalnızca JPG, PNG veya WebP görseller yüklenebilir.");
      return;
    }
    if (file.size > MAX_MENU_IMAGE_FILE_BYTES) {
      window.alert(`Görsel çok büyük (en fazla ~${Math.round(MAX_MENU_IMAGE_FILE_BYTES / 1024)} KB).`);
      return;
    }

    setImageUploading(true);
    try {
      const payload = new FormData();
      payload.set("file", file);
      const res = await fetch("/api/menu/upload-image", {
        method: "POST",
        body: payload,
      });
      const json = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || !json.imageUrl) {
        window.alert(json.error ?? "Görsel yüklenemedi.");
        return;
      }
      setImageDataUrl(json.imageUrl);
    } catch {
      window.alert("Görsel yüklenemedi.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categories.length) {
      window.alert("Önce en az bir kategori ekleyin.");
      return;
    }
    const cid = categoryId.trim();
    if (!cid || !categories.some((c) => c.id === cid)) {
      window.alert("Geçerli bir kategori seçin.");
      return;
    }
    const n = name.trim();
    if (!n) {
      window.alert("Ürün adı zorunludur.");
      return;
    }
    const safePrice = parsePriceInput(price);
    if (Number.isNaN(safePrice)) {
      window.alert("Geçerli bir birim fiyatı girin.");
      return;
    }
    const usePkg = usePackagePrice;
    let safePackage = 0;
    if (usePkg) {
      safePackage = parsePriceInput(packagePrice);
      if (Number.isNaN(safePackage)) {
        window.alert("Paket fiyatı için geçerli bir tutar girin.");
        return;
      }
    }
    if (imageUploading) {
      window.alert("Görsel yükleme tamamlanmadan kaydedemezsiniz.");
      return;
    }
    const fields: ProductFormFields = {
      categoryId: cid,
      name: n,
      description: description.trim().slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH),
      ingredients: ingredients.trim(),
      price: safePrice,
      usePackagePrice: usePkg,
      packagePrice: usePkg ? safePackage : 0,
      hidden,
      signatureDish: signatureDish && !hidden,
      checkoutUpsell: checkoutUpsell && !hidden,
      imageDataUrl,
      warningPresetKeys: sanitizeMenuWarningPresetKeys(warningPresetKeys),
      customWarnings: sanitizeCustomMenuWarnings(customWarnings),
      variationGroups: sanitizeVariationGroups(variationGroups),
    };
    try {
      await onSave(fields, mode === "edit" ? editingProduct?.id : undefined);
      onClose();
    } catch (err) {
      window.alert(err instanceof Error && err.message ? err.message : "Ürün kaydedilemedi. Lütfen tekrar deneyin.");
    }
  }

  if (!open) return null;

  const title = mode === "edit" ? "Ürünü düzenle" : "Yeni ürün";

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center p-4 sm:items-center sm:p-6" role="presentation">
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
            {title}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-cat`}>
                  Kategori
                </label>
                <select
                  id={`${baseId}-cat`}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.hidden ? " (gizli)" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-secondary">
                  Yanlış kategoriye eklediyseniz buradan taşıyabilirsiniz.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-img`}>
                  Ürün görseli
                </label>
                <input
                  id={`${baseId}-img`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={imageUploading}
                  className="mt-1 block w-full text-sm text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-container"
                />
                <p className="mt-1 text-[11px] text-secondary">
                  Yaklaşık {Math.round(MAX_MENU_IMAGE_FILE_BYTES / 1024)} KB’a kadar; Storage&apos;a yüklenir ve URL olarak kaydedilir.
                </p>
                {imageUploading ? (
                  <p className="mt-2 text-xs font-medium text-primary">Görsel yükleniyor…</p>
                ) : null}
                {imageDataUrl ? (
                  <div className="relative mt-3 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageDataUrl}
                      alt=""
                      className="h-28 max-w-full rounded-xl border border-surface-container-high object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageDataUrl("")}
                      className="mt-2 text-xs font-semibold text-primary hover:text-primary-container"
                    >
                      Görseli kaldır
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-name`}>
                  Ürün adı
                </label>
                <input
                  id={`${baseId}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-desc`}>
                  Açıklama <span className="font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  id={`${baseId}-desc`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_PRODUCT_DESCRIPTION_LENGTH))}
                  rows={3}
                  maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
                  className="mt-1 w-full resize-y rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1 text-[11px] text-secondary">
                  {description.length}/{MAX_PRODUCT_DESCRIPTION_LENGTH} karakter
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-ing`}>
                  İçindekiler <span className="font-normal">(virgülle ayırın)</span>
                </label>
                <textarea
                  id={`${baseId}-ing`}
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={2}
                  placeholder="Örn. 100gr Tavuk, Soğan, Patates"
                  className="mt-1 w-full resize-y rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="rounded-xl border border-surface-container-high bg-surface-container-low/50">
                <button
                  type="button"
                  onClick={() => setWarningsOpen((prev) => !prev)}
                  aria-expanded={warningsOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div>
                    <h3 className="font-headline text-sm font-bold text-on-background">Alerjen ve uyari etiketleri</h3>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">
                      {warningPresetKeys.length + customWarnings.length > 0
                        ? `${warningPresetKeys.length + customWarnings.length} etiket secili`
                        : "QR menude ikon olarak gorunur"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-secondary">
                    {warningsOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {warningsOpen ? (
                  <div className="border-t border-surface-container-high px-4 pb-4 pt-4">
                    <p className="text-xs leading-relaxed text-secondary">
                      QR menude urun gorselinin sol altinda ikon olarak gorunur. Detay penceresinde ikon ve etiket adi
                      birlikte listelenir.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {MENU_WARNING_PRESETS.map((preset) => (
                        <label
                          key={preset.key}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-container-high bg-white px-3 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={warningPresetKeys.includes(preset.key)}
                            onChange={() => togglePresetWarning(preset.key)}
                            className="mt-0.5 h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-on-background">
                              <span className="material-symbols-outlined text-[18px] text-primary">{preset.icon}</span>
                              {preset.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-secondary">
                              {preset.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">Ozel uyari</h4>
                          <p className="mt-1 text-[11px] text-secondary">
                            Hazir listede olmayan etiketleri yazabilir, ikon secerek urunde gosterebilirsiniz.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addCustomWarning}
                          disabled={customWarnings.length >= MAX_CUSTOM_PRODUCT_WARNINGS}
                          className="rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
                        >
                          Uyari ekle
                        </button>
                      </div>

                      {customWarnings.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {customWarnings.map((item, index) => (
                            <div key={`${baseId}-cw-${index}`} className="rounded-xl border border-surface-container-high bg-white p-3">
                              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                <div>
                                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-cw-label-${index}`}>
                                    Etiket adi
                                  </label>
                                  <input
                                    id={`${baseId}-cw-label-${index}`}
                                    value={item.label}
                                    maxLength={MAX_CUSTOM_WARNING_LABEL_LENGTH}
                                    onChange={(e) => updateCustomWarning(index, { label: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() => removeCustomWarning(index)}
                                    className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3">
                                <p className="block text-xs font-medium text-secondary">Ikon sec</p>
                                <div className="mt-2 grid grid-cols-5 gap-2">
                                  {CUSTOM_WARNING_ICON_OPTIONS.map((option) => (
                                    <button
                                      key={`${baseId}-cw-icon-${index}-${option.icon}`}
                                      type="button"
                                      onClick={() => updateCustomWarning(index, { icon: option.icon })}
                                      title={option.label}
                                      className={[
                                        "flex h-11 items-center justify-center rounded-xl border transition",
                                        item.icon === option.icon
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-surface-container-high bg-surface-container-low text-secondary hover:bg-surface-container",
                                      ].join(" ")}
                                    >
                                      <span className="material-symbols-outlined text-[20px]">{option.icon}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-3">
                                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-cw-desc-${index}`}>
                                  Aciklama <span className="font-normal">(istege bagli)</span>
                                </label>
                                <input
                                  id={`${baseId}-cw-desc-${index}`}
                                  value={item.description}
                                  maxLength={MAX_CUSTOM_WARNING_DESCRIPTION_LENGTH}
                                  onChange={(e) => updateCustomWarning(index, { description: e.target.value })}
                                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-surface-container-high bg-surface-container-low/50">
                <button
                  type="button"
                  onClick={() => setVariationsOpen((prev) => !prev)}
                  aria-expanded={variationsOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div>
                    <h3 className="font-headline text-sm font-bold text-on-background">Seçenekler ve varyasyonlar</h3>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">
                      {variationGroups.length > 0
                        ? `${variationGroups.length} seçenek grubu`
                        : "Porsiyon, ilave malzeme gibi müşteri seçimleri"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-secondary">
                    {variationsOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {variationsOpen ? (
                  <div className="border-t border-surface-container-high px-4 pb-4 pt-4">
                    <p className="text-xs leading-relaxed text-secondary">
                      Her grup bir seçim başlığıdır (ör. “Porsiyon”). Seçeneklere fiyat farkı girin; standart seçenek
                      için 0 bırakın. Fark negatif olabilir (ör. küçük boy -5).
                    </p>

                    {variationGroups.length > 0 ? (
                      <div className="mt-4 space-y-4">
                        {variationGroups.map((group, groupIndex) => (
                          <div
                            key={group.id}
                            className="rounded-xl border border-surface-container-high bg-white p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                              <div>
                                <label
                                  className="block text-xs font-medium text-secondary"
                                  htmlFor={`${baseId}-vg-name-${groupIndex}`}
                                >
                                  Grup adı
                                </label>
                                <input
                                  id={`${baseId}-vg-name-${groupIndex}`}
                                  value={group.name}
                                  maxLength={MAX_VARIATION_GROUP_NAME_LENGTH}
                                  placeholder="Örn. Porsiyon"
                                  onChange={(e) => updateVariationGroup(groupIndex, { name: e.target.value })}
                                  className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => removeVariationGroup(groupIndex)}
                                  className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error hover:bg-error/10"
                                >
                                  Grubu sil
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                                  Seçim tipi
                                </p>
                                <div className="mt-1 flex gap-1 rounded-lg border border-surface-container-highest p-1">
                                  {(["single", "multi"] as VariationSelectionType[]).map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => updateVariationGroup(groupIndex, { type })}
                                      className={[
                                        "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                        group.type === type
                                          ? "bg-primary text-white"
                                          : "text-secondary hover:bg-surface-container-low",
                                      ].join(" ")}
                                    >
                                      {type === "single" ? "Tek seçim" : "Çoklu seçim"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <label className="flex cursor-pointer items-center gap-2 pt-4 text-sm text-on-background">
                                <input
                                  type="checkbox"
                                  checked={group.required}
                                  onChange={(e) => updateVariationGroup(groupIndex, { required: e.target.checked })}
                                  className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                                />
                                Zorunlu
                              </label>
                            </div>

                            <div className="mt-3 space-y-2">
                              {group.options.map((option, optionIndex) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <input
                                    value={option.label}
                                    maxLength={MAX_VARIATION_OPTION_LABEL_LENGTH}
                                    placeholder="Seçenek (ör. Duble)"
                                    onChange={(e) =>
                                      updateVariationOption(groupIndex, optionIndex, { label: e.target.value })
                                    }
                                    className="min-w-0 flex-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                  <div className="relative w-24 shrink-0">
                                    <input
                                      value={option.priceDelta}
                                      inputMode="decimal"
                                      placeholder="0"
                                      onChange={(e) =>
                                        updateVariationOption(groupIndex, optionIndex, { priceDelta: e.target.value })
                                      }
                                      className="w-full rounded-xl border border-surface-container-highest bg-white py-2 pl-3 pr-6 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-secondary">
                                      ₺
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeVariationOption(groupIndex, optionIndex)}
                                    disabled={group.options.length <= 1}
                                    className="rounded-lg border border-surface-container-highest bg-white p-2 text-secondary hover:bg-surface-container-low disabled:opacity-40"
                                    aria-label="Seçeneği sil"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addVariationOption(groupIndex)}
                                disabled={group.options.length >= MAX_OPTIONS_PER_GROUP}
                                className="mt-1 rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-40"
                              >
                                Seçenek ekle
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={addVariationGroup}
                      disabled={variationGroups.length >= MAX_VARIATION_GROUPS}
                      className="mt-4 rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-40"
                    >
                      Seçenek grubu ekle
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[140px] flex-1">
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-price`}>
                    Birim fiyat (₺)
                  </label>
                  <input
                    id={`${baseId}-price`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm font-medium text-on-background">
                  <input
                    type="checkbox"
                    checked={usePackagePrice}
                    onChange={(e) => {
                      setUsePackagePrice(e.target.checked);
                      if (!e.target.checked) setPackagePrice("");
                    }}
                    className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                  />
                  Paket fiyatı
                </label>
              </div>

              {usePackagePrice ? (
                <div>
                  <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-pkg`}>
                    Paket fiyatı (₺) <span className="text-primary">— listelenen fiyat</span>
                  </label>
                  <input
                    id={`${baseId}-pkg`}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    className="mt-1 w-full max-w-xs rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ) : null}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-on-background">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setHidden(v);
                    if (v) {
                      setSignatureDish(false);
                      setCheckoutUpsell(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30"
                />
                Ürünü müşteri menüsünde gizle
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 text-sm text-on-background ${hidden ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={signatureDish}
                  disabled={hidden}
                  onChange={(e) => setSignatureDish(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
                />
                Müşteri menüsünde “İmza lezzet” olarak göster
              </label>
              <p className="text-[11px] text-secondary">
                Aynı anda yalnızca bir ürün seçilebilir; kaydettiğinizde diğer ürünlerden kaldırılır.
              </p>

              <label
                className={`flex cursor-pointer items-center gap-2 text-sm text-on-background ${hidden ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checkoutUpsell}
                  disabled={hidden}
                  onChange={(e) => setCheckoutUpsell(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-container-highest text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
                />
                Sepette “İyi gider” önerisi olarak göster
              </label>
              <p className="text-[11px] text-secondary">
                Sepette olmayan ürünler, ödeme modalında yatay listede önerilir (birden fazla ürün işaretlenebilir).
              </p>
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
              disabled={imageUploading}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-container"
            >
              {imageUploading ? "Yükleniyor…" : mode === "edit" ? "Kaydet" : "Ürünü ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
