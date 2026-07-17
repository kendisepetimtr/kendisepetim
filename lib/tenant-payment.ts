export type TenantPaymentFlags = {
  paymentCash: boolean;
  paymentDoorCard: boolean;
  paymentMealCard: boolean;
  /** Kasa tahsilatı / beyan — banka havalesi */
  paymentHavale: boolean;
  /** Restoranın ayarlardan seçtiği yemek kartı markaları (müşteri/kasa yalnızca bunları görür) */
  mealCardBrandIds: MealCardBrandId[];
};

export type CheckoutPaymentMethod = "cash" | "door_card" | "meal_card" | "havale";

/** Katalog — ayarlardan seçilir; müşteri ve kasada yalnızca seçilenler görünür */
export const MEAL_CARD_BRANDS = [
  { id: "multinet", label: "Multinet" },
  { id: "sodexo", label: "Sodexo" },
  { id: "edenred", label: "Edenred" },
  { id: "setcard", label: "Setcard" },
  { id: "metropol", label: "Metropol" },
  { id: "ticket", label: "Ticket" },
  { id: "paye", label: "Paye" },
  { id: "tokenflex", label: "TokenFlex" },
  { id: "winwin", label: "WinWin" },
] as const;

export type MealCardBrandId = (typeof MEAL_CARD_BRANDS)[number]["id"];

const MEAL_CARD_BRAND_ID_SET = new Set<string>(MEAL_CARD_BRANDS.map((b) => b.id));

export function isMealCardBrandId(value: unknown): value is MealCardBrandId {
  return typeof value === "string" && MEAL_CARD_BRAND_ID_SET.has(value);
}

export function isCheckoutPaymentMethod(value: unknown): value is CheckoutPaymentMethod {
  return value === "cash" || value === "door_card" || value === "meal_card" || value === "havale";
}

export function parseMealCardBrandIds(raw: unknown): MealCardBrandId[] {
  if (!Array.isArray(raw)) return [];
  const out: MealCardBrandId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isMealCardBrandId(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Yalnızca ayarlarda kayıtlı markalar — boşsa müşteriye hiçbiri gösterilmez */
export function resolveEnabledMealCardBrands(
  paymentMealCard: boolean,
  rawBrands: unknown,
): MealCardBrandId[] {
  if (!paymentMealCard) return [];
  return parseMealCardBrandIds(rawBrands);
}

export function mealCardBrandLabel(brandId?: string | null): string | undefined {
  if (!brandId) return undefined;
  return MEAL_CARD_BRANDS.find((b) => b.id === brandId)?.label;
}

export function isMealCardBrandAllowed(
  flags: TenantPaymentFlags,
  brand: string | undefined | null,
): brand is MealCardBrandId {
  if (!isMealCardBrandId(brand)) return false;
  return flags.mealCardBrandIds.includes(brand);
}

type TenantPaymentSource = {
  payment_cash?: boolean | null;
  payment_door_card?: boolean | null;
  payment_meal_card?: boolean | null;
  payment_meal_card_brands?: unknown;
};

export function tenantPaymentFlagsFromRow(row: TenantPaymentSource): TenantPaymentFlags {
  const paymentMealCard = row.payment_meal_card === true;
  const mealCardBrandIds = resolveEnabledMealCardBrands(paymentMealCard, row.payment_meal_card_brands);
  return {
    paymentCash: row.payment_cash !== false,
    paymentDoorCard: row.payment_door_card === true,
    paymentMealCard: paymentMealCard && mealCardBrandIds.length > 0,
    /** Kasa her zaman havale seçebilir (QR kapı ödemesinde gösterilmez) */
    paymentHavale: true,
    mealCardBrandIds,
  };
}

export function tenantPaymentFlagsFromProfile(profile: {
  paymentCash: boolean;
  paymentDoorCard: boolean;
  paymentMealCard: boolean;
  paymentMealCardBrands?: unknown;
}): TenantPaymentFlags {
  const mealCardBrandIds = resolveEnabledMealCardBrands(
    profile.paymentMealCard,
    profile.paymentMealCardBrands,
  );
  return {
    paymentCash: profile.paymentCash,
    paymentDoorCard: profile.paymentDoorCard,
    paymentMealCard: profile.paymentMealCard && mealCardBrandIds.length > 0,
    paymentHavale: false,
    mealCardBrandIds,
  };
}

export function countEnabledPaymentMethods(t: TenantPaymentFlags): number {
  let n = 0;
  if (t.paymentCash) n += 1;
  if (t.paymentDoorCard) n += 1;
  if (t.paymentMealCard) n += 1;
  if (t.paymentHavale) n += 1;
  return n;
}

export function isPaymentMethodEnabled(
  flags: TenantPaymentFlags,
  method: CheckoutPaymentMethod,
): boolean {
  if (method === "cash") return flags.paymentCash;
  if (method === "door_card") return flags.paymentDoorCard;
  if (method === "meal_card") return flags.paymentMealCard;
  if (method === "havale") return flags.paymentHavale;
  return false;
}

export function paymentMethodLabel(method: CheckoutPaymentMethod, mealCardBrandId?: string): string {
  if (method === "cash") return "Nakit";
  if (method === "door_card") return "Kredi Kartı";
  if (method === "havale") return "Havale";
  const brand = mealCardBrandLabel(mealCardBrandId);
  return brand ? `Yemek Kartı (${brand})` : "Yemek Kartı";
}

/** Oturumdan gelen tercih geçerli değilse ilk açık yönteme düşer */
export function pickDefaultPaymentMethod(
  flags: TenantPaymentFlags,
  preferred: CheckoutPaymentMethod | "",
): CheckoutPaymentMethod | "" {
  if (preferred && isPaymentMethodEnabled(flags, preferred)) return preferred;
  if (flags.paymentCash) return "cash";
  if (flags.paymentDoorCard) return "door_card";
  if (flags.paymentMealCard) return "meal_card";
  if (flags.paymentHavale) return "havale";
  return "";
}
