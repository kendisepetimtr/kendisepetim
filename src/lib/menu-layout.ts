/** Müşteri menüsü şablonları — önizleme galerisi ile aynı kimlikler */
export type MenuFabTheme = "m1" | "m3" | "m5" | "m6" | "m7" | "m8";

export type MenuFabTriggerMode = "logo" | "plus" | "dots";

export const MENU_FAB_THEMES: MenuFabTheme[] = ["m1", "m3", "m5", "m6", "m7", "m8"];

export const MENU_LAYOUT_DEFAULT: MenuFabTheme = "m1";

export function isMenuFabTheme(value: string): value is MenuFabTheme {
  return (MENU_FAB_THEMES as string[]).includes(value);
}

export const MENU_VARIANT_CARDS: {
  id: MenuFabTheme;
  label: string;
  shortLabel: string;
  description: string;
  fabTrigger: MenuFabTriggerMode;
}[] = [
  {
    id: "m1",
    label: "Klasik zarif",
    shortLabel: "V1",
    description: "Kapak, ortada logo; liste düzeni.",
    fabTrigger: "plus",
  },
  {
    id: "m3",
    label: "Koyu premium",
    shortLabel: "V2",
    description: "Kapak üzerinde logo; koyu tonlar.",
    fabTrigger: "plus",
  },
  {
    id: "m5",
    label: "Editorial",
    shortLabel: "V3",
    description: "Geniş kapak ve güçlü tipografi.",
    fabTrigger: "logo",
  },
  {
    id: "m6",
    label: "OneQR",
    shortLabel: "V4",
    description: "Sticky kategori çubuğu ve liste satırları.",
    fabTrigger: "plus",
  },
  {
    id: "m7",
    label: "Nordic minimal",
    shortLabel: "V5",
    description: "Sade başlık; kapak isteğe bağlı.",
    fabTrigger: "dots",
  },
  {
    id: "m8",
    label: "Rustik",
    shortLabel: "V6",
    description: "Sıcak tonlar, çerçeveli logo.",
    fabTrigger: "logo",
  },
];

export function fabTriggerForLayout(theme: MenuFabTheme): MenuFabTriggerMode {
  const row = MENU_VARIANT_CARDS.find((c) => c.id === theme);
  return row?.fabTrigger ?? "logo";
}
