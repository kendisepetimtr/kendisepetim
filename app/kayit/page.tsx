import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/register-form";
import SiteLogo from "@/components/site-logo";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Ucretsiz Dene",
  description:
    "Restoraninizi KendiSepetim'e kaydedin; yonetim paneli ve alt alan adinizla QR menuye hemen baslayin.",
};

type Props = {
  searchParams?: Promise<{ reason?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const q = searchParams ? await searchParams : {};
  const supabaseConfigured = !!getSupabaseEnv();
  const tenantMissing = q.reason === "tenant-missing";

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-medium text-primary underline-offset-2 hover:underline">
          Giriş yap
        </Link>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>

          {tenantMissing ? (
            <p
              className="mb-6 rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-sm text-on-background"
              role="status"
            >
              Oturumunuz var ancak işletme kaydı bulunamadı. Aşağıdan kaydı tamamlayın veya destek ile iletişime geçin.
            </p>
          ) : null}

          <RegisterForm supabaseConfigured={supabaseConfigured} />
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-secondary">
        © {new Date().getFullYear()} KendiSepetim
      </footer>
    </div>
  );
}
