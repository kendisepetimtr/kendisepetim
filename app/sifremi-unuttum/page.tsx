import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/forgot-password-form";
import SiteLogo from "@/components/site-logo";

export const metadata: Metadata = {
  title: "Şifremi unuttum",
  description: "KendiSepetim hesabınız için şifre sıfırlama bağlantısı isteyin.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-surface-container-low/50 via-background to-background">
      <p className="absolute right-6 top-5 text-right text-sm text-secondary sm:right-10 sm:top-8">
        <Link href="/giris" className="font-medium text-primary underline-offset-2 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex justify-center sm:mb-12">
            <SiteLogo variant="auth" />
          </div>

          <ForgotPasswordForm />
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-secondary">
        © {new Date().getFullYear()} KendiSepetim
      </footer>
    </div>
  );
}
