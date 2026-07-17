import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SuperadminLoginForm from "@/components/superadmin/superadmin-login-form";
import { getSuperadminSessionValid } from "@/lib/superadmin/guard";

export const metadata: Metadata = {
  title: "Süperadmin giriş",
};

export default async function SuperadminLoginPage() {
  if (await getSuperadminSessionValid()) {
    redirect("/superadmin");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="font-headline text-xs font-bold uppercase tracking-widest text-primary">KendiSepetim</p>
          <h1 className="mt-2 font-headline text-2xl font-extrabold tracking-tight">Süperadmin</h1>
          <p className="mt-2 text-sm text-secondary">Supabase hesabınızla giriş yapın</p>
        </div>
        <SuperadminLoginForm />
      </div>
    </div>
  );
}
