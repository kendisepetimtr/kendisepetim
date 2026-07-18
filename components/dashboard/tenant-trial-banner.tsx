"use client";

import type { LocalTenantProfile } from "@/lib/local-tenant";
import {
  getTenantAccessTier,
  getTrialDaysRemaining,
} from "@/lib/tenant-entitlements";

type Props = {
  tenant: Pick<LocalTenantProfile, "plan" | "trialEndsAt">;
};

/** Dashboard / admin üstünde deneme geri sayımı veya Free uyarı bandı. */
export default function TenantTrialBanner({ tenant }: Props) {
  const tier = getTenantAccessTier({
    plan: tenant.plan,
    trialEndsAt: tenant.trialEndsAt,
  });

  if (tier === "lifetime" || tier === "premium") return null;

  if (tier === "trial") {
    const days = getTrialDaysRemaining({
      plan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt,
    });
    const endLabel = tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    return (
      <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-on-background sm:px-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="material-symbols-outlined text-[18px] text-amber-800" aria-hidden>
            hourglass_top
          </span>
          <p className="font-semibold text-amber-950">
            Ücretsiz kullanım — {days} gün kaldı
          </p>
          {endLabel ? <span className="text-xs text-amber-900/80">· Bitiş: {endLabel}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-on-background sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden>
          info
        </span>
        <p>
          <span className="font-semibold">Ücretsiz plan:</span> QR menü görüntüleme ve menü
          düzenleme açık. Sipariş, kasa, garson ve marketplace için Premium gerekir.
        </p>
      </div>
    </div>
  );
}
