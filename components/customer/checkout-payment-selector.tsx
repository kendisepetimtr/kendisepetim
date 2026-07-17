"use client";

import {
  countEnabledPaymentMethods,
  MEAL_CARD_BRANDS,
  tenantPaymentFlagsFromProfile,
  type CheckoutPaymentMethod,
  type MealCardBrandId,
  type TenantPaymentFlags,
} from "@/lib/tenant-payment";
import type { PublicCheckoutMirror } from "@/lib/public-checkout-mirror";
import { useEffect, useId } from "react";

type CheckoutPaymentSelectorProps = {
  options: TenantPaymentFlags;
  method: CheckoutPaymentMethod | "";
  mealCardBrandId: MealCardBrandId | "";
  onMethodChange: (m: CheckoutPaymentMethod | "") => void;
  onMealCardBrandChange: (id: MealCardBrandId | "") => void;
  /** door: QR kapıda ödeme metinleri; counter: kasa (Nakit / Kredi Kartı / Yemek Kartı) */
  labelVariant?: "door" | "counter";
};

export default function CheckoutPaymentSelector({
  options,
  method,
  mealCardBrandId,
  onMethodChange,
  onMealCardBrandChange,
  labelVariant = "door",
}: CheckoutPaymentSelectorProps) {
  const baseId = useId();
  const n = countEnabledPaymentMethods(options);
  const brandIds = options.mealCardBrandIds ?? [];
  const enabledBrands = MEAL_CARD_BRANDS.filter((b) => brandIds.includes(b.id));
  const showMealCard = options.paymentMealCard && enabledBrands.length > 0;
  const enabledBrandKey = brandIds.join(",");

  useEffect(() => {
    if (!mealCardBrandId) return;
    const ids = enabledBrandKey.length > 0 ? enabledBrandKey.split(",") : [];
    if (!ids.includes(mealCardBrandId)) {
      onMealCardBrandChange("");
    }
  }, [enabledBrandKey, mealCardBrandId, onMealCardBrandChange]);

  if (n === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
        Bu işletme henüz ödeme seçeneği tanımlamamış. Lütfen işletmeyle iletişime geçin veya daha sonra tekrar deneyin.
      </div>
    );
  }

  const cashLabel = labelVariant === "counter" ? "Nakit" : "Kapıda nakit";
  const cardLabel = labelVariant === "counter" ? "Kredi Kartı" : "Kapıda kredi kartı";
  const mealLabel = "Yemek Kartı";

  const rowCls =
    "flex cursor-pointer items-center gap-3 rounded-xl border border-surface-container-high bg-white px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.04]";

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold uppercase tracking-wider text-secondary">Ödeme yöntemi</legend>
      {labelVariant === "door" ? (
        <p className="text-[11px] leading-relaxed text-secondary">Çevrimiçi ödeme yok; kapıda ödeme seçenekleri.</p>
      ) : null}
      <div className="space-y-2">
        {options.paymentCash ? (
          <label className={rowCls}>
            <input
              type="radio"
              name={`${baseId}-pay`}
              checked={method === "cash"}
              onChange={() => onMethodChange("cash")}
              className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium text-on-background">{cashLabel}</span>
          </label>
        ) : null}
        {options.paymentDoorCard ? (
          <label className={rowCls}>
            <input
              type="radio"
              name={`${baseId}-pay`}
              checked={method === "door_card"}
              onChange={() => onMethodChange("door_card")}
              className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium text-on-background">{cardLabel}</span>
          </label>
        ) : null}
        {options.paymentHavale ? (
          <label className={rowCls}>
            <input
              type="radio"
              name={`${baseId}-pay`}
              checked={method === "havale"}
              onChange={() => onMethodChange("havale")}
              className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium text-on-background">Havale</span>
          </label>
        ) : null}
        {showMealCard ? (
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low/40 p-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1">
              <input
                type="radio"
                name={`${baseId}-pay`}
                checked={method === "meal_card"}
                onChange={() => onMethodChange("meal_card")}
                className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
              />
              <span className="text-sm font-medium text-on-background">{mealLabel}</span>
            </label>
            {method === "meal_card" ? (
              <div className="mt-3 space-y-2 border-t border-surface-container-high pt-3" role="group" aria-label="Kart türü">
                <p className="text-[11px] font-medium text-secondary">Kart seçin</p>
                {enabledBrands.map((b) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/80">
                    <input
                      type="radio"
                      name={`${baseId}-meal`}
                      checked={mealCardBrandId === b.id}
                      onChange={() => onMealCardBrandChange(b.id)}
                      className="h-4 w-4 border-surface-container-highest text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm text-on-background">{b.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

/** Public menü: tenant ve mirror aynı alanları taşır */
export function mirrorAsPaymentOptions(m: PublicCheckoutMirror): TenantPaymentFlags {
  return tenantPaymentFlagsFromProfile({
    paymentCash: m.paymentCash,
    paymentDoorCard: m.paymentDoorCard,
    paymentMealCard: m.paymentMealCard,
    paymentMealCardBrands: m.paymentMealCardBrands,
  });
}
