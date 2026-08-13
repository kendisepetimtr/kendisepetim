import type { Metadata } from "next";
import Link from "next/link";
import MusteriRegisterForm from "@/components/musteri/musteri-register-form";
import SiteLogo from "@/components/site-logo";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Müşteri kaydı",
  description: "Yemek siparişi için müşteri hesabı oluşturun. Restoran kaydı ayrıdır.",
};

export default function MusteriRegisterPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        Zaten hesabınız var mı?{" "}
        <Link href={MUSTERI_LOGIN_PATH} className="font-medium text-primary hover:underline">
          Giriş yap
        </Link>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>
          <MusteriRegisterForm supabaseConfigured={!!getSupabaseEnv()} />
        </div>
      </div>
    </div>
  );
}
