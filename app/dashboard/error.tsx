"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-headline text-xl font-bold text-on-background">Panel yüklenemedi</h1>
      <p className="mt-2 max-w-md text-sm text-secondary">
        Geçici bir sunucu hatası oluştu. Sayfayı yenileyin veya tekrar giriş yapın.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          Tekrar dene
        </button>
        <a
          href="/giris?next=/dashboard"
          className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold text-on-background"
        >
          Giriş sayfası
        </a>
      </div>
    </div>
  );
}
