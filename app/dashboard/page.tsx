import type { Metadata } from "next";
import DashboardClient from "@/components/dashboard/dashboard-client";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Panel",
  description: "Restoran yonetim paneli — KendiSepetim.",
};

export default function DashboardPage() {
  return <DashboardClient remoteAuthEnabled={!!getSupabaseEnv()} />;
}
