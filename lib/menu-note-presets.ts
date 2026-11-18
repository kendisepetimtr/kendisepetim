/** Kategori kestirme ürün notları — POS chip seçimi için. */

export const MAX_NOTE_PRESETS_PER_CATEGORY = 12;
export const MAX_NOTE_PRESET_LENGTH = 40;
/** Ürün modalında satır içinde kaç chip gösterilsin; fazlası «Tümü» sheet’te. */
export const INLINE_NOTE_PRESET_CHIP_LIMIT = 5;
export const NOTE_PRESET_JOIN = " · ";

export function sanitizeNotePresets(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const label = raw.trim().replace(/\s+/g, " ").slice(0, MAX_NOTE_PRESET_LENGTH);
    if (!label) continue;
    const key = label.toLocaleLowerCase("tr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_NOTE_PRESETS_PER_CATEGORY) break;
  }
  return out;
}

export function composeLineNote(presets: string[], freeText: string): string {
  const parts = [...sanitizeNotePresets(presets)];
  const free = freeText.trim().replace(/\s+/g, " ");
  if (free) parts.push(free);
  return parts.join(NOTE_PRESET_JOIN);
}

export function toggleNotePreset(selected: string[], preset: string): string[] {
  const label = preset.trim();
  if (!label) return selected;
  const key = label.toLocaleLowerCase("tr");
  const has = selected.some((s) => s.toLocaleLowerCase("tr") === key);
  if (has) return selected.filter((s) => s.toLocaleLowerCase("tr") !== key);
  return [...selected, label];
}
