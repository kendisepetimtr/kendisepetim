import type { Metadata } from "next";
import Link from "next/link";
import MusteriLoginForm from "@/components/musteri/musteri-login-form";
import SiteLogo from "@/components/site-logo";
import { loadMusteriSession } from "@/lib/musteri/session";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MUSTERI_REGISTER_PATH } from "@/lib/musteri/paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Müşteri girişi",
  description: "Yemek siparişi için müşteri hesabınıza giriş yapın.",
};

type Props = {
  searchParams?: Promise<{
    verified?: string;
    kayit?: string;
    durum?: string;
    mesaj?: string;
  }>;
};

function noticeFromSearch(
  q: Record<string, string | undefined>,
): "email-verified" | "signup-ok" | "password-updated" | null {
  if (q.durum === "sifre-guncellendi") return "password-updated";
  if (q.verified === "1" || q.verified === "true" || q.durum === "dogrulandi") return "email-verified";
  if (q.kayit === "tamam" || q.durum === "kayit-tamam") return "signup-ok";
  return null;
}

export default async function MusteriLoginPage({ searchParams }: Props) {
  const q = searchParams ? await searchParams : {};
  const notice = noticeFromSearch(q as Record<string, string | undefined>);
  const oauthError = q.durum === "oauth-hata" && typeof q.mesaj === "string" ? q.mesaj : null;
  const wrongKind = q.durum === "yanlis-hesap-turu";
  const session = await loadMusteriSession();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        Hesabınız yok mu?{" "}
        <Link href={MUSTERI_REGISTER_PATH} className="font-medium text-primary hover:underline">
          Kayıt olun
        </Link>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>
          {wrongKind ? (
            <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              Bu hesap restoran kaydına bağlı. Yemek siparişi için ayrı bir müşteri hesabı kullanın.
            </p>
          ) : null}
          {q.durum === "hesap-engelli" ? (
            <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              Bu müşteri hesabı kapatıldı. Sipariş ve giriş şu an kullanılamaz.
            </p>
          ) : null}
          <MusteriLoginForm
            supabaseConfigured={!!getSupabaseEnv()}
            notice={notice}
            oauthError={oauthError}
            signedIn={session.kind !== "guest"}
            signedInEmail={session.email}
            signedInKind={session.kind === "guest" ? "guest" : session.kind}
          />
        </div>
      </div>
    </div>
  );
}
