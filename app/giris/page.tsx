import type { Metadata } from "next";
import LoginForm from "@/components/login-form";
import SiteLogo from "@/components/site-logo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restoran girişi",
  description: "KendiSepetim işletme paneli girişi. Müşteri siparişi için ayrı giriş kullanın.",
};

type Props = {
  searchParams?: Promise<{
    next?: string;
    /** E-posta doğrulama sonrası (Supabase redirect URL’ine ekleyin: …/giris?verified=1) */
    verified?: string;
    /** Kayıt tamam, giriş bekleniyor */
    kayit?: string;
    durum?: string;
    mesaj?: string;
  }>;
};

function loginNoticeFromSearchParams(
  q: Record<string, string | undefined>,
): "email-verified" | "signup-ok" | "password-updated" | null {
  const passwordUpdated = q.durum === "sifre-guncellendi";
  if (passwordUpdated) return "password-updated";

  const verified =
    q.verified === "1" ||
    q.verified === "true" ||
    q.durum === "dogrulandi" ||
    q.durum === "eposta-dogrulandi";
  if (verified) return "email-verified";

  const signupOk = q.kayit === "tamam" || q.kayit === "basarili" || q.durum === "kayit-tamam";
  if (signupOk) return "signup-ok";

  return null;
}

export default async function LoginPage({ searchParams }: Props) {
  const q = searchParams ? await searchParams : {};
  const nextRaw = typeof q.next === "string" ? q.next : "/dashboard";
  const nextPath = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const notice = loginNoticeFromSearchParams(q as Record<string, string | undefined>);
  const oauthError =
    q.durum === "oauth-hata" && typeof q.mesaj === "string" ? q.mesaj : null;

  let signedIn = false;
  let signedInEmail: string | null = null;
  if (getSupabaseEnv()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = !!user;
      signedInEmail = user?.email ?? null;
    } catch {
      signedIn = false;
      signedInEmail = null;
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        Henüz restoran hesabınız yok mu?{" "}
        <a href="/kayit" className="font-medium text-primary underline-offset-2 hover:underline">
          Restoran kaydı
        </a>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>

          {q.durum === "yanlis-hesap-turu" ? (
            <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              Bu hesap müşteri kaydına bağlı. Restoran paneli için ayrı bir e-posta ile giriş yapın.
            </p>
          ) : null}
          <LoginForm
            nextPath={nextPath}
            notice={notice}
            oauthError={oauthError}
            signedIn={signedIn}
            signedInEmail={signedInEmail}
            supabaseConfigured={!!getSupabaseEnv()}
          />
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-secondary">
        © {new Date().getFullYear()} KendiSepetim
      </footer>
    </div>
  );
}
