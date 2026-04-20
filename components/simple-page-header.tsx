import Link from "next/link";
import SiteLogo from "@/components/site-logo";

const links = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/#features", label: "Özellikler" },
  { href: "/#pricing", label: "Fiyatlandırma" },
  { href: "/kayit", label: "Ücretsiz Dene" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/iletisim", label: "İletişim" },
];

export default function SimplePageHeader() {
  return (
    <header className="border-b border-surface-container-highest/50 bg-background/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-4">
        <SiteLogo variant="compact" />
        <ul className="flex flex-wrap items-center gap-6 text-sm font-medium text-secondary">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-primary-container">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
