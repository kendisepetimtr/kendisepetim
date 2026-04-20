import Link from "next/link";
import SiteLogo from "@/components/site-logo";

const links = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/hakkimizda", label: "Hakkimizda" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/iletisim", label: "Iletisim" },
];

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <SiteLogo variant="compact" />
        <ul className="flex items-center gap-5 text-sm font-medium text-slate-700">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-blue-700">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
