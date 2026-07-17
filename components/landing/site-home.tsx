import Link from "next/link";
import RestaurantCard from "@/components/marketplace/restaurant-card";
import SiteLogo from "@/components/site-logo";
import type { MarketplaceListing } from "@/lib/marketplace";
import { LAUNCH_CITY, LAUNCH_DISTRICT } from "@/lib/turkey-geography";

type SiteHomeProps = {
  listings: MarketplaceListing[];
};

const HOME_GRID_LIMIT = 12;

export default function SiteHome({ listings }: SiteHomeProps) {
  const visible = listings.slice(0, HOME_GRID_LIMIT);
  const hasMore = listings.length > HOME_GRID_LIMIT;

  return (
    <>
      <header className="glass-nav fixed top-0 left-0 z-50 w-full">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 sm:py-4">
          <SiteLogo variant="landing" />
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/restoranlar"
              className="font-headline text-base font-medium tracking-tight text-slate-600 transition-colors hover:text-primary-container"
            >
              Restoranlar
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
              Giriş
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
        {/* Hero — tek kompozisyon */}
        <section className="relative overflow-hidden border-b border-surface-container-highest bg-gradient-to-br from-primary/[0.06] via-background to-surface-container-low/80">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(188,0,12,0.08),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-primary">
                KendiSepetim
              </p>
              <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-on-background sm:text-5xl lg:text-6xl">
                Sipariş ve menü{" "}
                <span className="text-primary">tek yerde</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-secondary sm:text-lg">
                Restoranınızın QR menüsü kendi adresinde yayınlanır; müşteriler yakınındaki
                restoranlardan sipariş verir.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#restoranlar"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
                >
                  Restoranlara bak
                  <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                </a>
                <Link
                  href="/kayit"
                  className="inline-flex items-center gap-2 rounded-2xl border border-surface-container-highest bg-white px-6 py-3.5 text-sm font-bold text-on-background transition hover:bg-surface-container-low"
                >
                  Restoranını kaydet
                </Link>
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
              <Link
                href="/restoranlar"
                className="text-sm font-bold text-primary hover:underline"
              >
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
                      href="/restoranlar"
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

        {/* Ürün — kısa, homojen */}
        <section id="ozellikler" className="scroll-mt-28 border-y border-surface-container-highest bg-surface-container-low/50 px-4 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
                QR menüden kasaya
              </h2>
              <p className="mt-2 text-secondary">
                Her restoran kendi markasıyla; müşteri ve işletme aynı ekosistemde.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <ProductLine
                icon="qr_code_2"
                title="QR menü"
                body="sizinadiniz.kendisepetim.com — temassız sipariş, anlık menü güncelleme."
              />
              <ProductLine
                icon="point_of_sale"
                title="Kasa"
                body="Masa, gel-al ve paket siparişleri tek panelden yönetin."
              />
              <ProductLine
                icon="person_pin"
                title="Garson"
                body="Masadan sipariş alın, hesabı kasaya iletin — fiş kasada."
              />
            </div>
          </div>
        </section>

        {/* Planlar — ₺ yok */}
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
                bullets={[
                  "Tüm özellikler açık",
                  "Limit yok",
                  "Kredi kartı gerekmez",
                ]}
                cta="Kayda başla"
                ctaHref="/kayit"
                featured={false}
              />
              <PlanCard
                title="Aylık"
                subtitle="Esnek abonelik, dilediğinizde iptal"
                bullets={[
                  "Sınırsız QR menü",
                  "Masa, garson ve kurye",
                  "Raporlama",
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
            <h2 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Restoranınızı bugün dijitalleştirin
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              İlk 3 ay bedava. QR menü, kasa ve garson tek platformda.
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
                  <Link className="transition-colors hover:text-white" href="/restoranlar">
                    Restoranlar
                  </Link>
                </li>
                <li>
                  <a className="transition-colors hover:text-white" href="#ozellikler">
                    QR Menü
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
                    Giriş
                  </Link>
                </li>
                <li>
                  <Link className="transition-colors hover:text-white" href="/kayit">
                    Kayıt
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl pt-8 text-xs font-bold text-surface-variant/40">
          © 2026 KendiSepetim. Tüm hakları saklıdır.
        </div>
      </footer>
    </>
  );
}

function ProductLine({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
