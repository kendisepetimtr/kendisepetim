import Link from "next/link";

type MarketingHomeProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function MarketingHomePage({ searchParams }: MarketingHomeProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Restoran siparis platformu
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
          KendiSepetim
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Tam landing ve planlar hazir olana kadar buradan devam edebilirsiniz.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {params.error}
          </p>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Kayit ol
          </Link>
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Giris yap
          </Link>
        </div>
      </div>
    </main>
  );
}
