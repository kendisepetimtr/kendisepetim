export type MenuWarningPresetKey = "spicy" | "gluten" | "milk" | "egg" | "nuts";

export type MenuWarningPreset = {
  key: MenuWarningPresetKey;
  label: string;
  description: string;
  icon: string;
};

export type MenuProductCustomWarning = {
  label: string;
  description: string;
  icon: string;
};

export type MenuProductWarningBadge = {
  key: string;
  label: string;
  description: string;
  icon: string;
  isCustom: boolean;
};

export const MENU_WARNING_PRESETS: readonly MenuWarningPreset[] = [
  {
    key: "spicy",
    label: "Aci",
    description: "Acili urun. Hassasiyetiniz varsa dikkatli tuketin.",
    icon: "local_fire_department",
  },
  {
    key: "gluten",
    label: "Gluten",
    description: "Gluten icerebilir.",
    icon: "bakery_dining",
  },
  {
    key: "milk",
    label: "Sut",
    description: "Sut veya laktoz icerebilir.",
    icon: "local_cafe",
  },
  {
    key: "egg",
    label: "Yumurta",
    description: "Yumurta icerebilir.",
    icon: "egg_alt",
  },
  {
    key: "nuts",
    label: "Kuruyemis",
    description: "Kuruyemis veya yer fistigi icerebilir.",
    icon: "nutrition",
  },
] as const;

export const MAX_CUSTOM_PRODUCT_WARNINGS = 6;
export const MAX_CUSTOM_WARNING_LABEL_LENGTH = 24;
export const MAX_CUSTOM_WARNING_DESCRIPTION_LENGTH = 100;
export const DEFAULT_CUSTOM_WARNING_ICON = "warning";

export const CUSTOM_WARNING_ICON_OPTIONS = [
  { icon: "warning", label: "Genel uyari" },
  { icon: "local_fire_department", label: "Alev" },
  { icon: "info", label: "Bilgi" },
  { icon: "restaurant", label: "Restoran" },
  { icon: "bakery_dining", label: "Gluten" },
  { icon: "egg_alt", label: "Yumurta" },
  { icon: "local_cafe", label: "Sut" },
  { icon: "nutrition", label: "Kuruyemis" },
  { icon: "spa", label: "Bitkisel" },
  { icon: "do_not_disturb_on", label: "Kacinin" },
] as const;

const PRESET_KEY_SET = new Set<string>(MENU_WARNING_PRESETS.map((item) => item.key));
const CUSTOM_ICON_SET = new Set<string>(CUSTOM_WARNING_ICON_OPTIONS.map((item) => item.icon));

export function sanitizeMenuWarningPresetKeys(input: unknown): MenuWarningPresetKey[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<MenuWarningPresetKey>();
  for (const item of input) {
    if (typeof item !== "string") continue;
    const key = item.trim().toLowerCase();
    if (PRESET_KEY_SET.has(key)) {
      unique.add(key as MenuWarningPresetKey);
    }
  }
  return [...unique];
}

export function sanitizeCustomMenuWarnings(input: unknown): MenuProductCustomWarning[] {
  if (!Array.isArray(input)) return [];
  const items: MenuProductCustomWarning[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const description = typeof record.description === "string" ? record.description.trim() : "";
    const iconRaw = typeof record.icon === "string" ? record.icon.trim() : "";
    if (!label) continue;
    items.push({
      label: label.slice(0, MAX_CUSTOM_WARNING_LABEL_LENGTH),
      description: description.slice(0, MAX_CUSTOM_WARNING_DESCRIPTION_LENGTH),
      icon: CUSTOM_ICON_SET.has(iconRaw) ? iconRaw : DEFAULT_CUSTOM_WARNING_ICON,
    });
    if (items.length >= MAX_CUSTOM_PRODUCT_WARNINGS) break;
  }

  return items;
}

export function buildMenuProductWarningBadges(
  presetKeys: readonly string[],
  customWarnings: readonly MenuProductCustomWarning[],
): MenuProductWarningBadge[] {
  const badges: MenuProductWarningBadge[] = [];
  const safeKeys = sanitizeMenuWarningPresetKeys(presetKeys);
  const safeCustom = sanitizeCustomMenuWarnings(customWarnings);

  for (const key of safeKeys) {
    const preset = MENU_WARNING_PRESETS.find((item) => item.key === key);
    if (!preset) continue;
    badges.push({
      key: preset.key,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
      isCustom: false,
    });
  }

  safeCustom.forEach((item, index) => {
    badges.push({
      key: `custom-${index}-${item.label.toLowerCase()}`,
      label: item.label,
      description: item.description,
      icon: item.icon,
      isCustom: true,
    });
  });

  return badges;
}
