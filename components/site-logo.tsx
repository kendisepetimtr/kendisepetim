import Image from "next/image";
import Link from "next/link";

type SiteLogoVariant = "landing" | "footer" | "compact" | "auth" | "panel" | "header";

const variantStyles: Record<
  SiteLogoVariant,
  { text: string; imgClass: string; size: number; priority: boolean }
> = {
  landing: {
    text: "font-headline text-2xl font-extrabold tracking-tighter text-[#bc000c]",
    imgClass: "h-[108px] w-[108px]",
    size: 108,
    priority: true,
  },
  footer: {
    text: "font-headline text-3xl font-extrabold tracking-tighter text-white",
    imgClass: "h-[120px] w-[120px]",
    size: 120,
    priority: false,
  },
  compact: {
    text: "font-headline text-xl font-extrabold tracking-tighter text-primary",
    imgClass: "h-[96px] w-[96px]",
    size: 96,
    priority: false,
  },
  header: {
    text: "font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-3xl",
    imgClass: "h-14 w-14 sm:h-16 sm:w-16",
    size: 64,
    priority: true,
  },
  auth: {
    text: "font-headline text-lg font-bold tracking-tight text-[#bc000c]",
    imgClass: "h-[108px] w-[108px]",
    size: 108,
    priority: true,
  },
  panel: {
    text: "font-headline text-base font-bold tracking-tight text-[#bc000c]",
    imgClass: "h-[72px] w-[72px]",
    size: 72,
    priority: false,
  },
};

type SiteLogoProps = {
  variant?: SiteLogoVariant;
  /** Dar panel: yalnızca logo görseli (yazı yok) */
  iconOnly?: boolean;
};

export default function SiteLogo({ variant = "landing", iconOnly = false }: SiteLogoProps) {
  if (iconOnly) {
    return (
      <Link href="/" className="flex shrink-0 items-center justify-center" title="KendiSepetim">
        <Image
          src="/ks-logo.png"
          alt="KendiSepetim"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority={false}
        />
      </Link>
    );
  }

  const v = variantStyles[variant];
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <Image
        src="/ks-logo.png"
        alt="KendiSepetim"
        width={v.size}
        height={v.size}
        className={`shrink-0 object-contain ${v.imgClass}`}
        priority={v.priority}
      />
      <span className={v.text}>KendiSepetim</span>
    </Link>
  );
}
