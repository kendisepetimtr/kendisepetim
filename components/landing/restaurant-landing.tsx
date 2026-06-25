import Link from "next/link";
import SiteLogo from "@/components/site-logo";

function ImagePlaceholder({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center bg-surface-container/80 text-center text-sm font-medium text-secondary ring-1 ring-inset ring-outline/25 ${className}`}
    >
      {label}
    </div>
  );
}

export default function RestaurantLanding({ skipHero = false }: { skipHero?: boolean }) {
  return (
    <>
      <header className="glass-nav fixed top-0 left-0 z-50 w-full">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-4">
          <SiteLogo variant="landing" />
          <div className="hidden items-center space-x-8 md:flex">
            <Link
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="/kesfet"
            >
              Keşfet
            </Link>
            <a
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="#features"
            >
              Özellikler
            </a>
            <a
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="#pricing"
            >
              Fiyatlandırma
            </a>
            <a
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="/hizmetler"
            >
              Çözümler
            </a>
            <Link
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="/iletisim"
            >
              İletişim
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              className="font-headline text-lg font-medium tracking-tight text-slate-600 transition-colors duration-200 hover:text-primary-container"
              href="/giris"
            >
              Giriş yap
            </Link>
            <Link
              href="/kayit"
              className="rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:opacity-80 sm:px-6 sm:text-base"
            >
              Ücretsiz Dene
            </Link>
          </div>
        </nav>
        <div className="h-px w-full bg-[#e8e8ea] opacity-50" />
      </header>

      <main className="pt-24">
        {skipHero ? null : (
        <section className="relative mx-auto max-w-7xl overflow-hidden px-8 py-20 lg:py-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold tracking-widest text-primary uppercase">
                <span className="material-symbols-outlined text-sm">restaurant</span>
                Yeni Nesil Restoran İşletmeciliği
              </div>
              <h1 className="font-headline text-5xl leading-tight font-extrabold tracking-tighter lg:text-7xl">
                Restoranınızı <br />
                <span className="text-primary italic">Dijital Güçle</span> <br />
                Yönetin.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-secondary lg:text-xl">
                Menünüz{" "}
                <span className="font-medium text-on-background">restoranadiniz.kendisepetim.com</span> adresinde
                yayınlanır — kendi markanızla, tek link. QR menüden masa yönetimine, raporlamaya kadar tüm araçlar tek
                platformda.
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link
                  href="/kayit"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white transition-all hover:shadow-2xl hover:shadow-primary/40"
                >
                  Hemen Başlayın <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link
                  href="/iletisim"
                  className="rounded-2xl bg-surface-container-high px-8 py-4 text-center text-lg font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  Demo İste
                </Link>
              </div>
            </div>
            <div className="group relative">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-3xl transition-colors group-hover:bg-primary/10" />
              <div className="relative rotate-2 rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-2xl transition-transform duration-500 group-hover:rotate-0">
                <ImagePlaceholder
                  label="Dashboard görseli — yakında"
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-surface-container-high bg-white p-6 shadow-xl md:block">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                    <span className="material-symbols-outlined">trending_up</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary">Günlük Ciro Artışı</div>
                    <div className="text-2xl font-bold text-on-background">+%24.8</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        <section className="bg-surface-container-low px-8 py-24" id="features">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="font-headline text-4xl font-extrabold tracking-tight">Kusursuz Bir Ekosistem</h2>
              <p className="mx-auto max-w-2xl text-secondary">
                Müşteriniz kapıdan girdiği andan itibaren tüm süreci dijitalleştirin.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-8 md:col-span-2 md:flex-row">
                <div className="flex-1 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">qr_code_2</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold">Akıllı QR Menü</h3>
                  <p className="text-secondary">
                    Her restoranın kendi adresi: <span className="font-medium text-on-background">sizinadiniz.kendisepetim.com</span>.
                    Garson bekletmeden sipariş, anlık fiyat güncelleme. Müşteriler kendi telefonlarından sipariş versin.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                      Temassız Ödeme
                    </li>
                    <li className="flex items-center gap-2 text-sm font-semibold text-secondary">
                      <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                      Görsel Odaklı Menü
                    </li>
                  </ul>
                </div>
                <div className="-mb-16 -mr-8 w-full md:w-1/2">
                  <ImagePlaceholder
                    label="Mobil QR menü ekranı — yakında"
                    className="rounded-t-3xl shadow-2xl min-h-[280px]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl bg-primary p-8 text-white">
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                    <span className="material-symbols-outlined">person_pin</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold">Garson Uygulaması</h3>
                  <p className="text-white/80">
                    Elde taşınan terminallerle mutfağa anında sipariş iletimi. Karışıklığa son.
                  </p>
                </div>
                <div className="flex justify-end pt-8">
                  <span className="material-symbols-outlined text-6xl opacity-20">smartphone</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl bg-surface-container-highest p-8">
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-on-surface/5 text-on-surface">
                    <span className="material-symbols-outlined">insights</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold">Yönetici Paneli</h3>
                  <p className="text-secondary">Stok takibi, personel performansı ve finansal raporlar cebinizde.</p>
                </div>
                <div className="pt-8">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-on-surface/10">
                    <div className="h-full w-2/3 bg-primary" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-8 md:col-span-2 md:flex-row-reverse">
                <div className="flex-1 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/10 text-tertiary">
                    <span className="material-symbols-outlined">grid_view</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold">Masa Yönetimi</h3>
                  <p className="text-secondary">
                    Doluluk oranlarını anlık izleyin, rezervasyonları kolayca yönetin. Restoran kat planınızı
                    dijitalleştirin.
                  </p>
                  <div className="flex gap-2">
                    <span className="rounded-lg bg-surface-container-low px-3 py-1 text-xs font-bold text-secondary">
                      Sürükle-Bırak
                    </span>
                    <span className="rounded-lg bg-surface-container-low px-3 py-1 text-xs font-bold text-secondary">
                      Zamanlayıcı
                    </span>
                  </div>
                </div>
                <div className="w-full md:w-1/2">
                  <ImagePlaceholder
                    label="Kat planı arayüzü — yakında"
                    className="min-h-[220px] rounded-2xl border border-surface-container-high"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-24">
          <div className="grid items-center gap-20 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 rounded-2xl bg-surface-container-low p-6">
                  <span className="material-symbols-outlined text-primary">speed</span>
                  <div className="font-bold">Işık Hızında</div>
                  <div className="text-xs text-secondary italic">Siparişler saniyeler içinde mutfakta.</div>
                </div>
                <div className="mt-8 space-y-2 rounded-2xl bg-surface-container-low p-6">
                  <span className="material-symbols-outlined text-primary">bar_chart</span>
                  <div className="font-bold">Anlık Rapor</div>
                  <div className="text-xs text-secondary italic">Cironuzu her an takip edin.</div>
                </div>
                <div className="space-y-2 rounded-2xl bg-surface-container-low p-6">
                  <span className="material-symbols-outlined text-primary">cloud</span>
                  <div className="font-bold">%100 Bulut</div>
                  <div className="text-xs text-secondary italic">Kurulum gerektirmez, her yerden erişim.</div>
                </div>
                <div className="mt-8 space-y-2 rounded-2xl bg-surface-container-low p-6">
                  <span className="material-symbols-outlined text-primary">support_agent</span>
                  <div className="font-bold">7/24 Destek</div>
                  <div className="text-xs text-secondary italic">Ekibimiz her an yanınızda.</div>
                </div>
              </div>
            </div>
            <div className="order-1 space-y-6 lg:order-2">
              <h2 className="font-headline text-4xl leading-tight font-extrabold">
                İşletmenizi Verilerle <br />
                Büyütün
              </h2>
              <p className="leading-relaxed text-secondary">
                KendiSepetim sadece bir sipariş sistemi değil, restoranınızın büyüme motorudur. Hangi
                ürününüzün daha çok sattığını, hangi garsonunuzun daha verimli olduğunu ve hangi saatlerde
                yoğunlaştığınızı tek bir panelden görün.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-2xl bg-on-surface px-8 py-4 font-bold text-surface-container-lowest"
                >
                  Tüm Özellikleri Gör
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low/50 px-8 py-24" id="pricing">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="font-headline text-4xl font-extrabold tracking-tight">Size Uygun Planı Seçin</h2>
              <p className="text-secondary">Şeffaf fiyatlandırma, sürpriz maliyet yok.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex h-full flex-col rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-8">
                <div className="mb-8">
                  <h3 className="mb-2 text-xl font-bold">Ücretsiz Deneme</h3>
                  <p className="text-lg font-medium text-secondary">14 gün, tüm özellikler</p>
                </div>
                <ul className="mb-12 flex-grow space-y-4">
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Tüm özellikler açık
                  </li>
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Limitler olmadan test
                    edin
                  </li>
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Kredi kartı gerekmez
                  </li>
                </ul>
                <Link
                  href="/kayit"
                  className="flex w-full items-center justify-center rounded-2xl border-2 border-surface-container-highest py-4 font-bold text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  Şimdi Başlat
                </Link>
              </div>

              <div className="relative flex h-full transform flex-col rounded-3xl border-2 border-primary bg-white p-8 shadow-2xl shadow-primary/10 md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold tracking-widest text-white uppercase">
                  En Popüler
                </div>
                <div className="mb-8">
                  <h3 className="mb-2 text-xl font-bold">Aylık</h3>
                  <p className="text-lg font-medium text-secondary">Esnek abonelik, dilediğinizde iptal</p>
                </div>
                <ul className="mb-12 flex-grow space-y-4">
                  <li className="flex items-center gap-3 font-semibold text-on-background">
                    <span className="material-symbols-outlined text-primary">check</span> Sınırsız QR Menü
                  </li>
                  <li className="flex items-center gap-3 font-semibold text-on-background">
                    <span className="material-symbols-outlined text-primary">check</span> Masa Yönetimi
                  </li>
                  <li className="flex items-center gap-3 font-semibold text-on-background">
                    <span className="material-symbols-outlined text-primary">check</span> Garson & Kurye Paneli
                  </li>
                  <li className="flex items-center gap-3 font-semibold text-on-background">
                    <span className="material-symbols-outlined text-primary">check</span> Gelişmiş Raporlama
                  </li>
                </ul>
                <Link
                  href="/kayit"
                  className="flex w-full items-center justify-center rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  Ücretsiz Dene
                </Link>
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-surface-container-highest bg-surface-container-lowest p-8">
                <div className="mb-8">
                  <h3 className="mb-2 text-xl font-bold">Yıllık</h3>
                  <p className="text-lg font-medium text-secondary">Uzun vadeli işletmeler için</p>
                </div>
                <ul className="mb-12 flex-grow space-y-4">
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Aylık planın tüm
                    özellikleri
                  </li>
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Öncelikli Destek
                  </li>
                  <li className="flex items-center gap-3 font-medium text-secondary">
                    <span className="material-symbols-outlined text-primary">check</span> Özel Eğitim Desteği
                  </li>
                </ul>
                <Link
                  href="/iletisim"
                  className="flex w-full items-center justify-center rounded-2xl border-2 border-surface-container-highest py-4 font-bold text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  Teklif Alın
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-24">
          <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary to-primary-container p-12 text-center text-white lg:p-20">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <span className="material-symbols-outlined absolute -right-20 -bottom-20 text-[300px]">
                restaurant_menu
              </span>
              <span className="material-symbols-outlined absolute -top-20 -left-20 text-[200px]">
                lunch_dining
              </span>
            </div>
            <div className="relative z-10 mx-auto max-w-3xl space-y-8">
              <h2 className="font-headline text-4xl leading-tight font-extrabold lg:text-6xl">
                Restoranınızın Geleceğini Bugün İnşa Edin
              </h2>
              <p className="text-lg text-white/80">
                KendiSepetim ile binlerce restoran sahibi işletmesini büyütüyor. Sıra sizde.
              </p>
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                <Link
                  href="/kayit"
                  className="rounded-2xl bg-white px-10 py-5 text-center text-xl font-black text-primary transition-all hover:shadow-2xl"
                >
                  Ücretsiz Denemeyi Başlat
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 bg-on-surface px-8 py-20 text-surface-variant">
        <div className="mx-auto max-w-7xl border-b border-white/10 pb-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="col-span-1 space-y-6 md:col-span-1">
              <SiteLogo variant="footer" />
              <p className="text-sm leading-relaxed text-surface-variant/60">
                Yeni nesil restoran yönetim platformu. İşletmenizi cebinizden yönetin.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  aria-label="Sosyal medya paylaşımı"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-primary"
                >
                  <span className="material-symbols-outlined text-sm">share</span>
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-bold tracking-widest text-white uppercase">Platform</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <a className="transition-colors hover:text-white" href="#features">
                    QR Menü
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#features">
                    Masa Yönetimi
                  </a>
                </li>
                <li>
                  <span className="opacity-70">Mutfak Ekranı</span>
                </li>
                <li>
                  <span className="opacity-70">Kurye Takibi</span>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-bold tracking-widest text-white uppercase">Şirket</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <Link className="transition-colors hover:text-white" href="/hakkimizda">
                    Hakkımızda
                  </Link>
                </li>
                <li>
                  <span className="opacity-70">Kariyer</span>
                </li>
                <li>
                  <span className="opacity-70">Blog</span>
                </li>
                <li>
                  <Link className="transition-colors hover:text-white" href="/iletisim">
                    İletişim
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-bold tracking-widest text-white uppercase">Yasal</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li>
                  <span className="opacity-70">Kullanım Şartları</span>
                </li>
                <li>
                  <span className="opacity-70">Gizlilik Politikası</span>
                </li>
                <li>
                  <span className="opacity-70">KVKK Aydınlatma</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 pt-8 text-xs font-bold text-surface-variant/40 md:flex-row">
          <div>© 2026 KendiSepetim. Tüm Hakları Saklıdır.</div>
          <div className="flex gap-8">
            <span>Türkçe (TR)</span>
            <span>English (EN)</span>
          </div>
        </div>
      </footer>
    </>
  );
}
