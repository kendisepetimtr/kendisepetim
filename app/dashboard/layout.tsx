import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import DashboardSessionBridge from "@/components/dashboard/dashboard-session-bridge";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const DASHBOARD_TENANT_SELECT = `
  id,
  created_at,
  updated_at,
  business_name,
  subdomain,
  owner_name,
  email,
  phone,
  owner_user_id,
  logo_url,
  cover_image_url,
  public_description,
  google_maps_url,
  seo_index_enabled,
  hours_day_mode,
  open_time,
  close_time,
  payment_cash,
  payment_door_card,
  payment_meal_card,
  plan,
  public_menu_enabled,
  dashboard_enabled
`;

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
    .select(DASHBOARD_TENANT_SELECT)
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
