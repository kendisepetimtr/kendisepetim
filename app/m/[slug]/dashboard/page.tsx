"use client";

import DashboardClient from "@/components/dashboard/dashboard-client";

/** Faz 1'e kadar mevcut dashboard — subdomain URL uzerinden erisilebilir. */
export default function TenantDashboardPage() {
  const remoteAuthEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
  );

  return <DashboardClient remoteAuthEnabled={remoteAuthEnabled} />;
}
