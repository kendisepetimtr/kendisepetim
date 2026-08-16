import type { Metadata } from "next";
import Link from "next/link";
import SiteLogo from "@/components/site-logo";
import { getOwnerTenantByUserId } from "@/lib/owner-tenant";
import { APPLICATION_STATUS_LABELS, parseApplicationStatus } from "@/lib/partner/status";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Başvurunuz alındı",
};

export default async function PartnerPendingPage() {
  let statusLabel = APPLICATION_STATUS_LABELS.pending;
  let businessName = "";
  let rejected = false;
  let signedIn = false;

  if (getSupabaseEnv()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        signedIn = true;
        const tenant = await getOwnerTenantByUserId(user.id);
        if (tenant) {
          businessName = tenant.business_name;
          const status = parseApplicationStatus(tenant.application_status);
          statusLabel = APPLICATION_STATUS_LABELS[status];
          rejected = status === "rejected";
        }
      }
    } catch {
      /* misafir mesajı */
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-surface-container-low/50 via-background to-background px-4 py-16">
      <div className="mb-10">
        <SiteLogo variant="auth" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 text-center shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Partner</p>
        <h1 className="mt-3 font-headline text-2xl font-extrabold tracking-tight">
          Talebiniz alındı
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          {businessName ? `${businessName} başvurusu ` : "Başvurunuz "}
          en kısa sürede incelenecek ve sizinle iletişime geçilecektir.
        </p>
        <p className="mt-4 text-sm font-semibold text-on-background">Durum: {statusLabel}</p>
        {rejected ? (
          <p className="mt-2 text-sm text-error">Başvuru reddedildiyse destek ekibi gerekçeyi iletecektir.</p>
        ) : null}
        <p className="mt-6 text-xs text-secondary">
          QR menü ve işletme paneli onaydan sonra açılır. Giriş yaparak bu ekranı tekrar görebilirsiniz.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          {signedIn ? (
            <Link href="/giris" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
              Hesap değiştir
            </Link>
          ) : (
            <Link href="/giris" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
              Giriş yap
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
