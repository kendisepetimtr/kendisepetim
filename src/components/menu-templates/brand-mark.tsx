import type { MenuFabTheme } from "@/lib/menu-layout";

type BrandMarkProps = {
  theme: MenuFabTheme;
  size: "fab" | "hero";
  /** Doluysa harf yerine logo gösterilir */
  logoUrl?: string | null;
  /** Logo yoksa gösterilecek baş harf */
  fallbackLetter?: string;
};

export function BrandMark({ theme, size, logoUrl, fallbackLetter }: BrandMarkProps) {
  const isHero = size === "hero";
  const dim = isHero ? "h-20 w-20 text-3xl" : "h-14 w-14 text-xl";
  const base = `flex shrink-0 select-none items-center justify-center font-bold ${dim}`;
  const letter = (fallbackLetter?.trim().charAt(0).toUpperCase() || "·").slice(0, 1);

  const logoImg =
    logoUrl != null && logoUrl !== "" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
    ) : null;

  switch (theme) {
    case "m1":
      return logoImg ? (
        <span
          className={`${base} overflow-hidden rounded-full border border-gray-200 bg-white shadow-md`}
        >
          {logoImg}
        </span>
      ) : (
        <span
          className={`${base} rounded-full border border-gray-200 bg-white font-serif text-gray-900 shadow-md`}
        >
          {letter}
        </span>
      );
    case "m3":
      return logoImg ? (
        <span
          className={`${base} overflow-hidden rounded-full border-2 border-amber-500/50 bg-stone-800 shadow-lg`}
        >
          {logoImg}
        </span>
      ) : (
        <span
          className={`${base} rounded-full border-2 border-amber-500/50 bg-stone-800 text-lg text-amber-100 shadow-lg`}
        >
          {letter}
        </span>
      );
    case "m5":
      return logoImg ? (
        <span className={`${base} overflow-hidden bg-gray-900 text-white shadow-xl`}>{logoImg}</span>
      ) : (
        <span className={`${base} bg-gray-900 text-white shadow-xl`}>{letter}</span>
      );
    case "m6":
      return logoImg ? (
        <span className={`${base} overflow-hidden rounded-full border border-blue-500/30 bg-blue-50 text-blue-900 shadow-md`}>
          {logoImg}
        </span>
      ) : (
        <span className={`${base} rounded-full border border-blue-500/30 bg-blue-50 font-serif text-blue-900 shadow-md`}>
          {letter}
        </span>
      );
    case "m7":
      return logoImg ? (
        <span
          className={`${base} overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm`}
        >
          {logoImg}
        </span>
      ) : (
        <span
          className={`${base} rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm`}
        >
          {letter}
        </span>
      );
    case "m8":
      return logoImg ? (
        <span
          className={`${base} overflow-hidden rounded-full border-2 border-amber-800/25 bg-amber-50 text-amber-900 shadow-md`}
        >
          {logoImg}
        </span>
      ) : (
        <span
          className={`${base} rounded-full border-2 border-amber-800/25 bg-amber-50 text-amber-900 shadow-md`}
        >
          {letter}
        </span>
      );
    default:
      return null;
  }
}
