"use client";

import DashboardClient from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  const remoteAuthEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
  );

  return <DashboardClient remoteAuthEnabled={remoteAuthEnabled} />;
}
