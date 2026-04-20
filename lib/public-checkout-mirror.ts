import type { LocalTenantProfile } from "@/lib/local-tenant";

export type PublicCheckoutMirror = {
  paymentCash: boolean;
  paymentDoorCard: boolean;
  paymentMealCard: boolean;
};

export function publicCheckoutStorageKey(subdomain: string): string {
  return `kendisepetim_public_checkout_v1_${subdomain.toLowerCase()}`;
}

const DEFAULTS: PublicCheckoutMirror = {
  paymentCash: true,
  paymentDoorCard: false,
  paymentMealCard: false,
};

export function readPublicCheckoutMirror(subdomain: string): PublicCheckoutMirror {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(publicCheckoutStorageKey(subdomain));
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<PublicCheckoutMirror>;
    return {
      paymentCash: p.paymentCash !== false,
      paymentDoorCard: p.paymentDoorCard === true,
      paymentMealCard: p.paymentMealCard === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePublicCheckoutMirror(profile: LocalTenantProfile): void {
  if (typeof window === "undefined") return;
  const payload: PublicCheckoutMirror = {
    paymentCash: profile.paymentCash,
    paymentDoorCard: profile.paymentDoorCard,
    paymentMealCard: profile.paymentMealCard,
  };
  window.localStorage.setItem(publicCheckoutStorageKey(profile.subdomain), JSON.stringify(payload));
}

export function clearPublicCheckoutMirror(subdomain: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(publicCheckoutStorageKey(subdomain));
}
