import Link from "next/link";
import GateAuthEntry from "@/components/landing/gate-auth-entry";
import SiteLogo from "@/components/site-logo";
import { ISLETME_HOME_PATH, MUSTERI_HOME_PATH } from "@/lib/musteri/paths";

export default function GateHome() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="glass-nav sticky top-0 z-40">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8 sm:py-3">
          <SiteLogo variant="landing" iconOnly />
          <GateAuthEntry />
        </nav>
        <div className="border-t border-[#e8e8ea]/50">
          <Link
            href="/"
            className="mx-auto block max-w-6xl px-4 py-2 text-center font-headline text-lg font-extrabold tracking-tighter text-[#bc000c] sm:px-8 sm:text-2xl"
          >
            KendiSepetim
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="land-fade-up font-headline text-3xl font-extrabold tracking-tight text-on-background sm:text-4xl lg:text-5xl">
            Ne yapmak istiyorsunuz?
          </h1>
          <p className="land-fade-up-delay-2 mx-auto mt-3 max-w-xl text-sm text-secondary sm:text-base">
            Yemek sipariş etmek ayrı, restoranını yönetmek ayrı. İki kapı, iki hesap.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
          <GateCard
            href={MUSTERI_HOME_PATH}
            icon="shopping_bag"
            eyebrow="Müşteriler için"
            title="Yemek sipariş ver"
            body="Bölgendeki restoranlardan sipariş ver. Adresin ve geçmişin bu cihazda saklanır; istersen hesap açarsın."
            cta="Sipariş vermeye başla"
            featured
          />
          <GateCard
            href={ISLETME_HOME_PATH}
            icon="storefront"
            eyebrow="Restoranlar için"
            title="Yemek teslim et"
            body="QR menü, kasa, garson ve kendi menü adresin. Restoran kaydı ve işletme paneli burada."
            cta="Restoranını tanıt"
            featured={false}
          />
        </div>
      </main>

      <footer className="px-4 py-8 text-center text-xs text-secondary sm:px-8">
        <p>© {new Date().getFullYear()} KendiSepetim</p>
      </footer>
    </div>
  );
}

function GateCard({
  href,
  icon,
  eyebrow,
  title,
  body,
  cta,
  featured,
}: {
  href: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  featured: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "land-fade-up-delay-2 group flex min-h-[280px] flex-col rounded-[1.75rem] p-7 transition sm:min-h-[340px] sm:p-9",
        featured
          ? "bg-gradient-to-br from-[#bc000c] to-[#e71418] text-white shadow-xl shadow-primary/25"
          : "border border-surface-container-highest bg-surface-container-lowest text-on-background hover:border-primary/30",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex size-14 items-center justify-center rounded-2xl",
          featured ? "bg-white/15" : "bg-primary/10 text-primary",
        ].join(" ")}
      >
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </span>
      <p
        className={[
          "mt-6 text-xs font-bold uppercase tracking-[0.2em]",
          featured ? "text-white/70" : "text-primary",
        ].join(" ")}
      >
        {eyebrow}
      </p>
      <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      <p className={["mt-3 max-w-md flex-1 text-sm leading-relaxed sm:text-base", featured ? "text-white/85" : "text-secondary"].join(" ")}>
        {body}
      </p>
      <span
        className={[
          "mt-8 inline-flex items-center gap-2 self-start rounded-2xl px-5 py-3 text-sm font-bold transition",
          featured
            ? "bg-white text-primary group-hover:shadow-lg"
            : "bg-primary text-white group-hover:bg-primary-container",
        ].join(" ")}
      >
        {cta}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </span>
    </Link>
  );
}
