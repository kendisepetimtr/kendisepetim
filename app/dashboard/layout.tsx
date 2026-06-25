import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import DashboardSessionBridge from "@/components/dashboard/dashboard-session-bridge";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!getSupabaseEnv()) {
    return <>{children}</>;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris?next=/dashboard");
  }

  const { data: row, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    redirect("/kayit?reason=tenant-missing");
  }

  const safeTenant = {
    ...(row as Omit<TenantRow, "owner_admin_pin_hash" | "owner_admin_pin_set_at">),
    owner_admin_pin_hash: null,
    owner_admin_pin_set_at: null,
  } as TenantRow;

  return <DashboardSessionBridge serverTenant={safeTenant}>{children}</DashboardSessionBridge>;
}
