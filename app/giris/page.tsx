import type { Metadata } from "next";
import LoginForm from "@/components/login-form";
import SiteLogo from "@/components/site-logo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Giriş",
  description: "KendiSepetim işletme paneli girişi.",
};

type Props = {
  searchParams?: Promise<{
    next?: string;
    /** E-posta doğrulama sonrası (Supabase redirect URL’ine ekleyin: …/giris?verified=1) */
    verified?: string;
    /** Kayıt tamam, giriş bekleniyor */
    kayit?: string;
    durum?: string;
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

  let signedIn = false;
  if (getSupabaseEnv()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = !!user;
    } catch {
      signedIn = false;
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        Henüz hesabınız yok mu?{" "}
        <a href="/kayit" className="font-medium text-primary underline-offset-2 hover:underline">
          Kayıt olun
        </a>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>

          <LoginForm nextPath={nextPath} notice={notice} signedIn={signedIn} />
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-secondary">
        © {new Date().getFullYear()} KendiSepetim
      </footer>
    </div>
  );
}
