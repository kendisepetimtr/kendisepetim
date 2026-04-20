"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { saveLocalTenant } from "@/lib/local-tenant";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { tenantRowToLocalProfile } from "@/lib/tenant-map";

/**
 * Sunucudan gelen tenant ile tarayıcıdaki localStorage profilini eşitler (panel bileşenleri local okuyor).
 */
export default function DashboardSessionBridge({
  serverTenant,
  children,
}: {
  serverTenant: TenantRow;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    saveLocalTenant(tenantRowToLocalProfile(serverTenant));
  }, [serverTenant]);

  return <>{children}</>;
}
