import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  isSuperadminSession,
  SUPERADMIN_SESSION_COOKIE,
} from "../../../lib/admin/superadmin";

async function logoutSuperadminAction() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_SESSION_COOKIE);
  redirect("/superadmin-login");
}

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SUPERADMIN_SESSION_COOKIE)?.value;
  if (!isSuperadminSession(session)) {
    redirect("/superadmin-login?error=" + encodeURIComponent("Superadmin girisi gerekli."));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold tracking-tight">KendiSepetim — Superadmin</p>
          <nav className="flex gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-white">
              Landing
            </Link>
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <form action={logoutSuperadminAction}>
              <button type="submit" className="hover:text-white">
                Çıkış
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menü</p>
          <nav className="space-y-1 text-sm">
            <Link
              href="/admin/restaurants"
              className="block rounded-md px-2 py-2 text-slate-200 transition hover:bg-slate-800"
            >
              Restoranlar
            </Link>
            <Link
              href="/admin/payments"
              className="block rounded-md px-2 py-2 text-slate-200 transition hover:bg-slate-800"
            >
              Ödemeler
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
