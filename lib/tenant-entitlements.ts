import type { TenantPlan } from "@/lib/supabase/tenant-types";

export const TRIAL_DAYS = 90;

export type TenantEntitlementInput = {
  plan: TenantPlan | string | null | undefined;
  trial_ends_at?: string | null;
  trialEndsAt?: string | null;
};

export type TenantAccessTier = "lifetime" | "premium" | "trial" | "free";

export function normalizeTenantPlan(plan: string | null | undefined): TenantPlan {
  if (plan === "premium" || plan === "lifetime") return plan;
  return "free";
}

/** Premium veya ömür boyu — deneme tarihinden bağımsız tam erişim. */
export function isUnlimitedPlan(plan: TenantPlan | string | null | undefined): boolean {
  return plan === "premium" || plan === "lifetime";
}

export function defaultTrialEndsAt(from: Date = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + TRIAL_DAYS);
  return d.toISOString();
}

function resolveTrialEndsAt(input: TenantEntitlementInput): string | null {
  const raw = input.trial_ends_at ?? input.trialEndsAt ?? null;
  if (!raw || typeof raw !== "string") return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Premium, ömür boyu veya aktif deneme → tam özellikler. */
export function hasFullTenantAccess(input: TenantEntitlementInput, now: Date = new Date()): boolean {
  if (isUnlimitedPlan(input.plan)) return true;
  const ends = resolveTrialEndsAt(input);
  if (!ends) return false;
  return Date.parse(ends) > now.getTime();
}

export function getTenantAccessTier(input: TenantEntitlementInput, now: Date = new Date()): TenantAccessTier {
  if (input.plan === "lifetime") return "lifetime";
  if (input.plan === "premium") return "premium";
  const ends = resolveTrialEndsAt(input);
  if (ends && Date.parse(ends) > now.getTime()) return "trial";
  return "free";
}

/** Kalan tam gün sayısı (yukarı yuvarlama); bitmişse 0. */
export function getTrialDaysRemaining(input: TenantEntitlementInput, now: Date = new Date()): number {
  if (isUnlimitedPlan(input.plan)) return 0;
  const ends = resolveTrialEndsAt(input);
  if (!ends) return 0;
  const ms = Date.parse(ends) - now.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isTrialActive(input: TenantEntitlementInput, now: Date = new Date()): boolean {
  return getTenantAccessTier(input, now) === "trial";
}

/** Free planda kapalı özellikler için kullanıcı mesajı. */
export const FREE_PLAN_UPGRADE_MESSAGE =
  "Ücretsiz planda bu özellik kapalı. Deneme süreniz bittiyse Premium’a geçerek sipariş, kasa, garson ve marketplace’i açabilirsiniz.";
