import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { stripTenantRowForClientSync } from "@/lib/tenant-client-sync";
import DashboardSessionBridge from "@/components/dashboard/dashboard-session-bridge";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function isNextNavigationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!getSupabaseEnv()) {
    return <>{children}</>;
  }

  try {
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

    const safeTenant = stripTenantRowForClientSync(row as TenantRow);

    return <DashboardSessionBridge serverTenant={safeTenant}>{children}</DashboardSessionBridge>;
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("[dashboard/layout]", error);
    redirect("/giris?next=/dashboard&durum=panel-hata");
  }
}
