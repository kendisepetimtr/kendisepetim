import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase";
import { getCurrentRestaurantContext } from "../../../features/tenants";
import { loginWithPassword } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; registered?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;

  if (user) {
    const restaurantContext = await getCurrentRestaurantContext();
    if (restaurantContext) {
      redirect("/dashboard");
    }
    redirect("/onboarding/restaurant");
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-6 py-12">
      <section className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Girisi</h1>
        <p className="mt-2 text-sm text-gray-600">
          Restoran yonetim paneline erismek icin giris yapin.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}

        {params.registered ? (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {params.message
              ? decodeURIComponent(params.message)
              : "Kayit tamam. Simdi giris yapabilirsiniz."}
          </p>
        ) : null}

        <form action={loginWithPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
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
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Giris Yap
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Hesabiniz yok mu?{" "}
          <Link href="/register" className="font-medium text-gray-900 underline">
            Kayit ol
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-gray-500">
          Pazarlama sayfasina donmek icin{" "}
          <Link href="/" className="text-gray-800 underline">
            tiklayin
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
