import type { Metadata } from "next";
import PartnerApplyForm from "@/components/partner/partner-apply-form";
import SiteLogo from "@/components/site-logo";
import { resolveAccountKind } from "@/lib/account-kind";
import { MUSTERI_HOME_PATH } from "@/lib/musteri/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getOwnerTenantByUserId, resolveOwnerDashboardUrl } from "@/lib/owner-tenant";
import { getRequestSiteUrl } from "@/lib/site-url";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner başvurusu",
  description: "Restoranınızı KendiSepetim partneri olarak kaydedin. QR menü ücretsizdir.",
};

export default async function RegisterPage() {
  const supabaseConfigured = !!getSupabaseEnv();

  if (supabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const kind = await resolveAccountKind(user);
        if (kind === "customer") redirect(MUSTERI_HOME_PATH);
        const tenant = await getOwnerTenantByUserId(user.id);
        if (tenant) {
          const origin = await getRequestSiteUrl();
          redirect(await resolveOwnerDashboardUrl(user.id, origin));
        }
      }
    } catch {
      /* formu göster */
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex justify-center">
          <SiteLogo variant="auth" />
        </div>
        <PartnerApplyForm supabaseConfigured={supabaseConfigured} />
        <footer className="mt-10 pb-6 text-center text-xs text-secondary">
          © {new Date().getFullYear()} KendiSepetim Partner
        </footer>
      </div>
    </div>
  );
}
