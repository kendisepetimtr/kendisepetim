export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Restoran operasyonlarinizin temel yonetim baslangic noktasi.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Kategoriler</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">Yonet</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Urunler</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">Guncelle</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Ayarlar</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">Duzenle</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Durum</p>
          <p className="mt-2 text-lg font-semibold text-emerald-600">Aktif</p>
        </article>
      </div>
    </section>
  );
}
