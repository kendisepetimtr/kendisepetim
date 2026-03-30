import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase";
import { getCurrentRestaurantContext } from "../../../features/tenants";
import { registerWithPassword } from "./actions";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const restaurantContext = await getCurrentRestaurantContext();
    if (restaurantContext) {
      redirect("/dashboard");
    }
    redirect("/onboarding/restaurant");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-6 py-12">
      <section className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Uye ol</h1>
        <p className="mt-2 text-sm text-gray-600">
          Hesap olusturun. Ardindan restoran adinizi ve menu adresinizi (slug) belirleyeceksiniz.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}

        <form action={registerWithPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Sifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="password_confirm"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Sifre tekrar
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Kayit ol
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Zaten hesabiniz var mi?{" "}
          <Link href="/login" className="font-medium text-gray-900 underline">
            Giris yap
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-gray-500">
          <Link href="/" className="text-gray-800 underline">
            Ana sayfaya don
          </Link>
        </p>
      </section>
    </main>
  );
}
