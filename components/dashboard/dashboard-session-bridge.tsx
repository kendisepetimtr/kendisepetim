"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { getLocalTenant, saveLocalTenant } from "@/lib/local-tenant";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";

/**
 * Sunucudan gelen tenant ile tarayıcıdaki localStorage profilini eşitler (panel bileşenleri local okuyor).
 * Büyük logo/kapak blob'ları sunucuda kırpıldığı için localStorage'daki görseller korunur.
 */
export default function DashboardSessionBridge({
  serverTenant,
  children,
}: {
  serverTenant: TenantRow;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    const existing = getLocalTenant();
    const profile = tenantRowToLocalProfile(serverTenant);
    if (existing && existing.subdomain === profile.subdomain) {
      if (!profile.logoDataUrl && existing.logoDataUrl) {
        profile.logoDataUrl = existing.logoDataUrl;
      }
      if (!profile.coverImageUrl && existing.coverImageUrl) {
        profile.coverImageUrl = existing.coverImageUrl;
      }
    }
    saveLocalTenant(profile);
  }, [serverTenant]);

  return <>{children}</>;
}
