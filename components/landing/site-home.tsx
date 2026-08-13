import Link from "next/link";
import RestaurantCard from "@/components/marketplace/restaurant-card";
import SiteLogo from "@/components/site-logo";
import type { MarketplaceListing } from "@/lib/marketplace";
import { LAUNCH_CITY, LAUNCH_DISTRICT } from "@/lib/turkey-geography";

type SiteHomeProps = {
  listings: MarketplaceListing[];
  platformVersion?: string | null;
};

const HOME_GRID_LIMIT = 12;

const MENU_CAPABILITIES = [
  {
    icon: "link",
    title: "Kendi menü adresiniz",
    body: "restoranadiniz.kendisepetim.com — markanıza özel, paylaşılabilir QR menü adresi.",
  },
  {
    icon: "travel_explore",
    title: "Google’da öne çıkın",
    body: "Menünüz arama motorlarında indexlenebilir; müşteriler sizi Google’da bulur.",
  },
  {
    icon: "warning",
    title: "Alerjen uyarıları",
    body: "Gluten, süt, yumurta, kuruyemiş ve özel uyarı etiketleriyle şeffaf menü.",
  },
  {
    icon: "local_fire_department",
    title: "Kalori bilgisi",
    body: "Ürün kalorilerini menüde gösterin; bilinçli seçimi kolaylaştırın.",
  },
  {
    icon: "translate",
    title: "Çoklu dil",
    body: "Menünüzü birden fazla dilde sunun; yerli ve yabancı misafire hitap edin.",
  },
  {
    icon: "qr_code_2",
    title: "QR menü & sipariş",
    body: "Masadan temassız sipariş; menüyü anında güncelleyin, yazdırma derdi yok.",
  },
  {
    icon: "point_of_sale",
    title: "Kasa paneli",
    body: "Masa, gel-al ve paket siparişleri tek ekrandan yönetin, ödeme alın.",
  },
  {
    icon: "person_pin",
    title: "Garson uygulaması",
    body: "Garson masadan sipariş alsın; fiş ve tahsilat kasada kalsın.",
  },
  {
    icon: "restaurant_menu",
    title: "Zengin ürün kartı",
    body: "Görsel, içerik, varyasyonlar ve imza yemeklerle menünüzü öne çıkarın.",
  },
] as const;

export default function SiteHome({ listings, platformVersion }: SiteHomeProps) {
  const visible = listings.slice(0, HOME_GRID_LIMIT);
  const hasMore = listings.length > HOME_GRID_LIMIT;

  return (
    <>
      <header className="glass-nav fixed top-0 left-0 z-50 w-full">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 sm:py-4">
          <SiteLogo variant="landing" />
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/musteri"
              className="font-headline text-base font-medium tracking-tight text-slate-600 transition-colors hover:text-primary-container"
            >
              Sipariş ver
            </Link>
            <a
              href="#ozellikler"
              className="font-headline text-base font-medium tracking-tight text-slate-600 transition-colors hover:text-primary-container"
            >
              Özellikler
            </a>
            <a
              href="#planlar"
              className="font-headline text-base font-medium tracking-tight text-slate-600 transition-colors hover:text-primary-container"
            >
              Planlar
            </a>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/giris"
              className="font-headline text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-primary-container sm:text-base"
            >
              Restoran girişi
            </Link>
            <Link
              href="/kayit"
              className="rounded-xl bg-gradient-to-b from-[#bc000c] to-[#e71418] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 sm:px-5"
            >
              Ücretsiz başla
            </Link>
          </div>
        </nav>
        <div className="h-px w-full bg-[#e8e8ea] opacity-50" />
      </header>

      <main className="pt-24">
        {/* Hero — marka + kendi adres vurgusu */}
        <section className="relative overflow-hidden border-b border-surface-container-highest bg-gradient-to-br from-primary/[0.07] via-background to-surface-container-low/90">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(188,0,12,0.1),transparent_55%)]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(26,28,30,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,28,30,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="land-fade-up font-headline text-xs font-bold uppercase tracking-[0.28em] text-primary">
                KendiSepetim
              </p>
              <h1 className="land-fade-up-delay-1 mt-4 font-headline text-4xl font-extrabold tracking-tight text-on-background sm:text-5xl lg:text-6xl">
                Menünüz kendi adresinde
              </h1>
              <p className="land-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-secondary sm:text-lg">
                QR menü, Google’da görünürlük, alerjen ve kalori bilgisi — restoranınız
                tek platformda dijitalleşir.
              </p>

              <div className="land-fade-up-delay-2 land-url-glow mt-8 max-w-xl overflow-hidden rounded-2xl border border-surface-container-highest bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-surface-container-highest px-4 py-2.5">
                  <span className="land-live-dot size-2.5 rounded-full bg-emerald-500" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    Canlı menü adresi
                  </span>
                </div>
                <p className="px-4 py-4 font-mono text-base font-semibold tracking-tight text-on-background sm:text-lg">
                  <span className="text-primary">restoranadiniz</span>
                  <span className="text-secondary">.kendisepetim.com</span>
                </p>
              </div>

              <div className="land-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
                <Link
                  href="/kayit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
                >
                  Ücretsiz başla
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <a
                  href="#ozellikler"
                  className="inline-flex items-center gap-2 rounded-2xl border border-surface-container-highest bg-white px-6 py-3.5 text-sm font-bold text-on-background transition hover:bg-surface-container-low"
                >
                  Özellikleri gör
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Restoranlar */}
        <section id="restoranlar" className="scroll-mt-28 bg-background px-4 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
                  Restoranlar
                </h2>
                <p className="mt-2 text-sm text-secondary sm:text-base">
                  {LAUNCH_CITY} {LAUNCH_DISTRICT} — menüye gidip sipariş verin
                </p>
              </div>
              <Link href="/musteri" className="text-sm font-bold text-primary hover:underline">
                Tüm restoranlar
              </Link>
            </div>

            {visible.length > 0 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((listing) => (
                    <RestaurantCard key={listing.id} listing={listing} />
                  ))}
                </div>
                {hasMore ? (
                  <div className="mt-10 text-center">
                    <Link
                      href="/musteri"
                      className="inline-flex items-center gap-2 rounded-2xl border border-surface-container-highest bg-white px-6 py-3 text-sm font-bold text-on-background hover:bg-surface-container-low"
                    >
                      Tüm restoranları gör
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low/40 px-6 py-14 text-center">
                <p className="font-headline text-lg font-bold text-on-background">
                  Yakında burada restoranlar olacak
                </p>
                <p className="mt-2 text-sm text-secondary">
                  İlk restoranlar profilini tamamlayınca bu alanda görünür.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Özellikler */}
        <section
          id="ozellikler"
          className="scroll-mt-28 border-y border-surface-container-highest bg-surface-container-low/50 px-4 py-16 sm:px-8 lg:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-2xl">
              <h2 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
                Menüden operasyona, tek platform
              </h2>
              <p className="mt-3 text-secondary">
                Kendi alt alan adınız, arama görünürlüğü ve müşteriye şeffaf menü — kasa ve
                garson aynı ekosistemde.
              </p>
            </div>

            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {MENU_CAPABILITIES.map((item) => (
                <FeatureItem key={item.title} icon={item.icon} title={item.title} body={item.body} />
              ))}
            </div>
          </div>
        </section>

        {/* Planlar */}
        <section id="planlar" className="scroll-mt-28 px-4 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 space-y-3 text-center">
              <h2 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
                Planlar
              </h2>
              <p className="text-secondary">
                İlk 3 ay ücretsiz, sonra aylık veya yıllık abonelik.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <PlanCard
                title="İlk 3 ay bedava"
                subtitle="Tüm özellikler, deneme sonrası abonelik"
                bullets={["Tüm özellikler açık", "Limit yok", "Kredi kartı gerekmez"]}
                cta="Kayda başla"
                ctaHref="/kayit"
                featured={false}
              />
              <PlanCard
                title="Aylık"
                subtitle="Esnek abonelik, dilediğinizde iptal"
                bullets={[
                  "Kendi menü adresiniz",
                  "Google’da indexlenebilir menü",
                  "Alerjen, kalori ve çoklu dil",
                  "Kasa, garson ve QR sipariş",
                ]}
                cta="Ücretsiz başla"
                ctaHref="/kayit"
                featured
                badge="En popüler"
              />
              <PlanCard
                title="Yıllık"
                subtitle="Uzun vadeli işletmeler için"
                bullets={[
                  "Aylık planın tüm özellikleri",
                  "Öncelikli destek",
                  "Özel eğitim desteği",
                ]}
                cta="Ücretsiz başla"
                ctaHref="/kayit"
                featured={false}
              />
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="px-4 pb-20 sm:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#bc000c] to-[#e71418] px-8 py-14 text-center text-white sm:px-12 lg:py-16">
            <p className="font-mono text-sm font-semibold text-white/80 sm:text-base">
              restoranadiniz.kendisepetim.com
            </p>
            <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Adresiniz hazır. Menünüz sizi bekliyor.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              İlk 3 ay bedava. QR menü, Google görünürlüğü, alerjen ve kalori — hepsi tek
              hesaptan.
            </p>
            <Link
              href="/kayit"
              className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 text-base font-black text-primary transition hover:shadow-xl"
            >
              Ücretsiz başla
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-on-surface px-4 py-16 text-surface-variant sm:px-8">
        <div className="mx-auto max-w-7xl border-b border-white/10 pb-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="space-y-4 md:col-span-1">
              <SiteLogo variant="footer" />
              <p className="text-sm leading-relaxed text-surface-variant/60">
                Restoran yönetim platformu — QR menü, sipariş ve operasyon.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Platform</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <Link className="transition-colors hover:text-white" href="/musteri">
                    Sipariş ver
                  </Link>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#ozellikler">
                    Özellikler
                  </a>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#planlar">
                    Planlar
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Şirket</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <Link className="transition-colors hover:text-white" href="/hakkimizda">
                    Hakkımızda
                  </Link>
                </li>
                <li>
                  <Link className="transition-colors hover:text-white" href="/iletisim">
                    İletişim
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Hesap</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li>
                  <Link className="transition-colors hover:text-white" href="/giris">
                    Restoran girişi
                  </Link>
                </li>
                <li>
                  <Link className="transition-colors hover:text-white" href="/kayit">
                    Restoran kaydı
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 pt-8 text-xs font-bold text-surface-variant/40">
          <p>© 2026 KendiSepetim. Tüm hakları saklıdır.</p>
          {platformVersion ? <p className="tabular-nums">v{platformVersion}</p> : null}
        </div>
      </footer>
    </>
  );
}

function FeatureItem({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <h3 className="mt-4 font-headline text-lg font-bold text-on-background">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{body}</p>
    </div>
  );
}

function PlanCard({
  title,
  subtitle,
  bullets,
  cta,
  ctaHref,
  featured,
  badge,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
  featured: boolean;
  badge?: string;
}) {
  return (
    <div
      className={[
        "relative flex h-full flex-col rounded-3xl p-7",
        featured
          ? "border-2 border-primary bg-white shadow-xl shadow-primary/10 md:-translate-y-2"
          : "border border-surface-container-highest bg-surface-container-lowest",
      ].join(" ")}
    >
      {badge ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          {badge}
        </div>
      ) : null}
      <div className="mb-6">
        <h3 className="font-headline text-xl font-bold text-on-background">{title}</h3>
        <p className="mt-1 text-sm text-secondary">{subtitle}</p>
      </div>
      <ul className="mb-8 flex-grow space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm font-medium text-secondary">
            <span className="material-symbols-outlined shrink-0 text-lg text-primary">check</span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={[
          "flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition",
          featured
            ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-container"
            : "border-2 border-surface-container-highest text-on-background hover:bg-surface-container-low",
        ].join(" ")}
      >
        {cta}
      </Link>
    </div>
  );
}
