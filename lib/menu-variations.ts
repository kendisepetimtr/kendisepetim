/**
 * Ürün varyasyonları (porsiyon, ilave malzeme vb.).
 * Grup -> seçenek iki seviyeli yapı; her seçenek fiyat farkı (priceDelta) taşır.
 * custom_warning_tags deseni: yazarken ve okurken sanitize edilir.
 */

export type VariationSelectionType = "single" | "multi";

export type VariationOption = {
  id: string;
  label: string;
  /** Temel fiyatın üzerine eklenen fark; negatif olabilir (küçük boy -5). */
  priceDelta: number;
};

export type VariationGroup = {
  id: string;
  name: string;
  type: VariationSelectionType;
  required: boolean;
  options: VariationOption[];
};

/** Sipariş / sepet anındaki seçim snapshot'ı (etiket + fark dahil). */
export type SelectedVariation = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionLabel: string;
  priceDelta: number;
};

export const MAX_VARIATION_GROUPS = 6;
export const MAX_OPTIONS_PER_GROUP = 12;
export const MAX_VARIATION_GROUP_NAME_LENGTH = 40;
export const MAX_VARIATION_OPTION_LABEL_LENGTH = 40;
export const MAX_VARIATION_PRICE_DELTA = 100000;

function makeVariationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizePriceDelta(input: unknown): number {
  const raw = typeof input === "number" ? input : typeof input === "string" ? Number(input.replace(",", ".")) : NaN;
  if (!Number.isFinite(raw)) return 0;
  const clamped = Math.max(-MAX_VARIATION_PRICE_DELTA, Math.min(MAX_VARIATION_PRICE_DELTA, raw));
  return roundMoney(clamped);
}

function sanitizeOption(input: unknown, usedIds: Set<string>): VariationOption | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!label) return null;

  let id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id || usedIds.has(id)) id = makeVariationId();
  usedIds.add(id);

  return {
    id,
    label: label.slice(0, MAX_VARIATION_OPTION_LABEL_LENGTH),
    priceDelta: sanitizePriceDelta(record.priceDelta),
  };
}

export function sanitizeVariationGroups(input: unknown): VariationGroup[] {
  if (!Array.isArray(input)) return [];
  const groups: VariationGroup[] = [];
  const usedGroupIds = new Set<string>();

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;

    const usedOptionIds = new Set<string>();
    const optionsRaw = Array.isArray(record.options) ? record.options : [];
    const options: VariationOption[] = [];
    for (const optRaw of optionsRaw) {
      const option = sanitizeOption(optRaw, usedOptionIds);
      if (option) options.push(option);
      if (options.length >= MAX_OPTIONS_PER_GROUP) break;
    }
    if (options.length === 0) continue;

    let id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || usedGroupIds.has(id)) id = makeVariationId();
    usedGroupIds.add(id);

    const type: VariationSelectionType = record.type === "multi" ? "multi" : "single";

    groups.push({
      id,
      name: name.slice(0, MAX_VARIATION_GROUP_NAME_LENGTH),
      type,
      required: record.required === true,
      options,
    });

    if (groups.length >= MAX_VARIATION_GROUPS) break;
  }

  return groups;
}

/**
 * Seçilen varyasyonları ürünün gerçek gruplarına karşı doğrular.
 * Etiket ve fiyat farkı katalogdan (authoritative) alınır; single grupta tek seçim.
 */
export function resolveSelectedVariations(
  groups: readonly VariationGroup[],
  rawSelected: unknown,
): SelectedVariation[] {
  if (!Array.isArray(rawSelected) || groups.length === 0) return [];

  const optionIndex = new Map<
    string,
    { group: VariationGroup; option: VariationOption }
  >();
  for (const group of groups) {
    for (const option of group.options) {
      optionIndex.set(`${group.id}::${option.id}`, { group, option });
    }
  }

  const singleGroupSeen = new Set<string>();
  const resolved: SelectedVariation[] = [];

  for (const raw of rawSelected) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const groupId = typeof record.groupId === "string" ? record.groupId : "";
    const optionId = typeof record.optionId === "string" ? record.optionId : "";
    if (!groupId || !optionId) continue;

    const match = optionIndex.get(`${groupId}::${optionId}`);
    if (!match) continue;
    if (match.group.type === "single") {
      if (singleGroupSeen.has(groupId)) continue;
      singleGroupSeen.add(groupId);
    }

    resolved.push({
      groupId: match.group.id,
      groupName: match.group.name,
      optionId: match.option.id,
      optionLabel: match.option.label,
      priceDelta: match.option.priceDelta,
    });
  }

  return sortSelectedVariations(groups, resolved);
}

/** Grupsuz / katalog dışı ortamlar için minimal sanitize (görüntüleme fallback'i). */
export function sanitizeSelectedVariations(input: unknown): SelectedVariation[] {
  if (!Array.isArray(input)) return [];
  const items: SelectedVariation[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const groupId = typeof record.groupId === "string" ? record.groupId.trim() : "";
    const optionId = typeof record.optionId === "string" ? record.optionId.trim() : "";
    const optionLabel = typeof record.optionLabel === "string" ? record.optionLabel.trim() : "";
    if (!optionId || !optionLabel) continue;
    items.push({
      groupId,
      groupName: typeof record.groupName === "string" ? record.groupName.trim().slice(0, MAX_VARIATION_GROUP_NAME_LENGTH) : "",
      optionId,
      optionLabel: optionLabel.slice(0, MAX_VARIATION_OPTION_LABEL_LENGTH),
      priceDelta: sanitizePriceDelta(record.priceDelta),
    });
  }
  return items;
}

function sortSelectedVariations(
  groups: readonly VariationGroup[],
  selected: SelectedVariation[],
): SelectedVariation[] {
  const groupOrder = new Map(groups.map((g, i) => [g.id, i]));
  return [...selected].sort((a, b) => {
    const ga = groupOrder.get(a.groupId) ?? 999;
    const gb = groupOrder.get(b.groupId) ?? 999;
    return ga - gb;
  });
}

export function sumVariationDeltas(selected: readonly { priceDelta: number }[]): number {
  return selected.reduce((sum, item) => sum + (Number.isFinite(item.priceDelta) ? item.priceDelta : 0), 0);
}

/** "Porsiyon: Duble", "İlave: Peynir" gibi fiş/ekran etiketleri. */
export function formatSelectedVariationLabels(selected: readonly SelectedVariation[]): string[] {
  return selected.map((item) =>
    item.groupName ? `${item.groupName}: ${item.optionLabel}` : item.optionLabel,
  );
}

export function hasVariations(groups: readonly VariationGroup[] | undefined | null): boolean {
  return Array.isArray(groups) && groups.length > 0;
}

export { makeVariationId };
