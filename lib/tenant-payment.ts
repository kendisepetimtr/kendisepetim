export type TenantPaymentFlags = {
  paymentCash: boolean;
  paymentDoorCard: boolean;
  paymentMealCard: boolean;
};

export type CheckoutPaymentMethod = "cash" | "door_card" | "meal_card";

export const MEAL_CARD_BRANDS = [
  { id: "multinet", label: "Multinet" },
  { id: "sodexo", label: "Sodexo" },
  { id: "edenred", label: "Edenred (Ticket Restaurant)" },
] as const;

export type MealCardBrandId = (typeof MEAL_CARD_BRANDS)[number]["id"];

export function countEnabledPaymentMethods(t: TenantPaymentFlags): number {
  let n = 0;
  if (t.paymentCash) n += 1;
  if (t.paymentDoorCard) n += 1;
  if (t.paymentMealCard) n += 1;
  return n;
}

export function paymentMethodLabel(method: CheckoutPaymentMethod, mealCardBrandId?: string): string {
  if (method === "cash") return "Kapıda nakit";
  if (method === "door_card") return "Kapıda kredi kartı";
  const brand = MEAL_CARD_BRANDS.find((b) => b.id === mealCardBrandId);
  return brand ? `Yemek kartı (${brand.label})` : "Yemek kartı";
}

/** Oturumdan gelen tercih geçerli değilse ilk açık yönteme düşer */
export function pickDefaultPaymentMethod(
  flags: TenantPaymentFlags,
  preferred: CheckoutPaymentMethod | "",
): CheckoutPaymentMethod | "" {
  if (preferred === "cash" && flags.paymentCash) return "cash";
  if (preferred === "door_card" && flags.paymentDoorCard) return "door_card";
  if (preferred === "meal_card" && flags.paymentMealCard) return "meal_card";
  if (flags.paymentCash) return "cash";
  if (flags.paymentDoorCard) return "door_card";
  if (flags.paymentMealCard) return "meal_card";
  return "";
}
