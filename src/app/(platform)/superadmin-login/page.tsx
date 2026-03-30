import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SUPERADMIN_SESSION_COOKIE,
  validateSuperadminLogin,
} from "../../../lib/admin/superadmin";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

async function superadminLoginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!validateSuperadminLogin(email, password)) {
    redirect("/superadmin-login?error=" + encodeURIComponent("E-posta veya şifre hatalı."));
  }

  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_SESSION_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect("/admin/restaurants");
}

export default async function SuperadminLoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = params.error;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h1 className="text-lg font-semibold">Superadmin Girişi</h1>
        <p className="mt-1 text-sm text-slate-400">Geçici giriş ekranı</p>

        {error ? <p className="mt-3 rounded bg-rose-950/50 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

        <form action={superadminLoginAction} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-400">
            E-posta
            <input
              type="email"
              name="email"
              defaultValue="kendisepetimtr@gmail.com"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Şifre
            <input
              type="password"
              name="password"
              defaultValue="0101"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
