import { isValidTenantSlug, normalizeTenantSlug } from "./slug";

const TR_MAP: Record<string, string> = {
  ğ: "g",
  ü: "u",
  ş: "s",
  ı: "i",
  ö: "o",
  ç: "c",
  Ğ: "g",
  Ü: "u",
  Ş: "s",
  İ: "i",
  Ö: "o",
  Ç: "c",
};

/**
 * Restoran adindan URL slug taslagi (Türkçe karakterler sadelestirilir).
 * Ornek: "Dürümcü Ekrem" -> "durumcu-ekrem"
 */
export function restaurantNameToBaseSlug(name: string): string {
  let s = name.trim();
  if (!s) return "restoran";

  for (const [k, v] of Object.entries(TR_MAP)) {
    s = s.split(k).join(v);
  }

  s = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  s = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!s) s = "restoran";

  if (s.length > 48) {
    s = s.slice(0, 48).replace(/-+$/g, "") || "restoran";
  }

  return normalizeTenantSlug(s);
}

/** Bos slug veya gecersizse true */
export function needsSlugFallback(slug: string): boolean {
  const t = normalizeTenantSlug(slug);
  return !t || !isValidTenantSlug(t);
}

export function candidateSlugFromBase(base: string, index: number): string {
  const b = normalizeTenantSlug(base);
  if (index <= 0) return b;
  return normalizeTenantSlug(`${b}${index}`);
}
