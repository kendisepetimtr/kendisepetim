import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function isNextNavigationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

/** Yalnızca oturum + tenant varlığı — profil verisi client server action ile senkron edilir. */
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

    const { count, error } = await supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", user.id);

    if (error || !count) {
      redirect("/kayit?reason=tenant-missing");
    }

    return <>{children}</>;
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("[dashboard/layout]", error);
    redirect("/giris?next=/dashboard&durum=panel-hata");
  }
}
