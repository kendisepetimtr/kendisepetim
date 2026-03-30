import { PageShell } from "../../../components/ui/page-shell";

/**
 * Arsiv: Tam marketing landing (v1).
 * Ana sayfa simdilik sadece giris ekrani; bu bilesen kullanilmiyor.
 */
export function MarketingLandingV1() {
  return (
    <PageShell
      title="KendiSepetim ile restoran siparislerinizi dijitale tasiyin"
      description="Subdomain tabanli restoran menu, siparis toplama ve yonetim panelini tek platformda birlestiren sade bir SaaS."
      className="space-y-10"
    >
      <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
        <p className="max-w-3xl text-base leading-7 text-gray-600">
          KendiSepetim, her restoran icin ozel alt alan adi (subdomain) ile menu yayinlama,
          siparis alma ve operasyon takibi sunar. MVP odakli yapisi sayesinde hizli kurulur,
          ekibiniz tarafindan kolayca yonetilir.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Ne yapiyor?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-medium">Restoran menusu yayinlar</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Her restoran kendi alaninda urun ve kategori bazli menuyu musterilerine sunar.
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-medium">Siparisleri tek yerde toplar</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Musteri siparisleri duzgun bir akisla dashboard tarafina duser.
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="font-medium">Yonetimi sade tutar</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Kategori, urun ve temel restoran ayarlari tek panelden yonetilir.
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Temel ozellikler</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            Cok kiracili (multi-tenant) altyapi
          </li>
          <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            Subdomain bazli restoran sayfasi
          </li>
          <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            Kategori ve urun yonetimi
          </li>
          <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            Siparis akisi icin hazir dashboard temeli
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-gray-900 p-6 text-white md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Demo ve iletisim</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-200">
          Restoraniniz icin KendiSepetim kurulumunu gormek veya erken erisim talep etmek
          icin bizimle iletisime gecebilirsiniz.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="mailto:demo@kendisepetim.com"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900"
          >
            Demo Talep Et
          </a>
          <a
            href="mailto:iletisim@kendisepetim.com"
            className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white"
          >
            Iletisime Gec
          </a>
        </div>
      </section>
    </PageShell>
  );
}
