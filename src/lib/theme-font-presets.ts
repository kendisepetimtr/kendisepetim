/** Dashboard tema aracı ve müşteri menüsünde ortak — DB’de saklanan id’ler */

export type FontOption = {
  id: string;
  label: string;
  /** CSS font-family (generic yedekli) */
  cssFamily: string;
  /** Google Fonts API family parametresi (tek aile) */
  googleParam: string;
};

export const HEADING_FONT_OPTIONS: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    cssFamily: '"Inter", system-ui, sans-serif',
    googleParam: "Inter:wght@500;600;700",
  },
  {
    id: "playfair_display",
    label: "Playfair Display",
    cssFamily: '"Playfair Display", Georgia, serif',
    googleParam: "Playfair+Display:wght@600;700",
  },
  {
    id: "dm_sans",
    label: "DM Sans",
    cssFamily: '"DM Sans", system-ui, sans-serif',
    googleParam: "DM+Sans:wght@400;500;600;700",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    cssFamily: '"Merriweather", Georgia, serif',
    googleParam: "Merriweather:wght@400;700",
  },
  {
    id: "lora",
    label: "Lora",
    cssFamily: '"Lora", Georgia, serif',
    googleParam: "Lora:wght@400;600;700",
  },
];

export const BODY_FONT_OPTIONS: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    cssFamily: '"Inter", system-ui, sans-serif',
    googleParam: "Inter:wght@400;500;600",
  },
  {
    id: "dm_sans",
    label: "DM Sans",
    cssFamily: '"DM Sans", system-ui, sans-serif',
    googleParam: "DM+Sans:wght@400;500;600",
  },
  {
    id: "source_sans_3",
    label: "Source Sans 3",
    cssFamily: '"Source Sans 3", system-ui, sans-serif',
    googleParam: "Source+Sans+3:wght@400;600",
  },
  {
    id: "lora",
    label: "Lora",
    cssFamily: '"Lora", Georgia, serif',
    googleParam: "Lora:wght@400;600",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    cssFamily: '"Merriweather", Georgia, serif',
    googleParam: "Merriweather:wght@400;700",
  },
];

export function findFontHeading(id: string): FontOption {
  return HEADING_FONT_OPTIONS.find((o) => o.id === id) ?? HEADING_FONT_OPTIONS[0]!;
}

export function findFontBody(id: string): FontOption {
  return BODY_FONT_OPTIONS.find((o) => o.id === id) ?? BODY_FONT_OPTIONS[0]!;
}

/** İki fontu tek Google Fonts CSS isteğinde birleştirir (önizleme ve menü). */
export function buildGoogleFontsStylesheetUrl(headingId: string, bodyId: string): string {
  const h = findFontHeading(headingId);
  const b = findFontBody(bodyId);
  const uniq = [...new Set([h.googleParam, b.googleParam])];
  return `https://fonts.googleapis.com/css2?${uniq.map((p) => `family=${p}`).join("&")}&display=swap`;
}
