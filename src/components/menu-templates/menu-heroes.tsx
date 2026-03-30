import { BrandMark } from "./brand-mark";

export type MenuHeroModel = {
  name: string;
  slug: string;
  tagline: string;
  logoUrl?: string | null;
};

export function CoverBlock({
  url,
  show,
  aspectClass = "aspect-[16/10]",
  roundedClass = "",
}: {
  url?: string | null;
  show: boolean;
  aspectClass?: string;
  roundedClass?: string;
}) {
  if (!show) return null;
  const wrap = `relative w-full overflow-hidden ${aspectClass} ${roundedClass}`;
  if (url) {
    return (
      <div className={wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div
      className={`flex ${wrap} items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 px-4 text-center text-[11px] font-medium leading-snug text-gray-600`}
    >
      Kapak görseli yok — isteğe bağlı alan
    </div>
  );
}

export function HeroM1({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <>
      <CoverBlock url={coverUrl} show aspectClass="aspect-[16/10]" />
      <div className="bg-white px-5 pb-2 pt-5">
        <div className="flex flex-col items-center">
          <BrandMark theme="m1" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-gray-400">
            {model.slug}.kendisepetim.com
          </p>
          <h1 className="mt-3 text-center font-serif text-2xl font-semibold tracking-tight text-gray-900">
            {model.name}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500">{model.tagline}</p>
        </div>
        <div className="mx-auto mt-5 h-px w-16 bg-gray-300" />
      </div>
    </>
  );
}

export function HeroM3({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <div className="relative">
      <CoverBlock url={coverUrl} show aspectClass="aspect-[16/11]" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 text-center">
        <BrandMark theme="m3" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
        <h1 className="mt-3 text-lg font-semibold tracking-wide text-amber-100">{model.name}</h1>
        <p className="mt-1 text-xs text-stone-400">{model.tagline}</p>
      </div>
    </div>
  );
}

export function HeroM5({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <>
      <CoverBlock url={coverUrl} show aspectClass="aspect-[21/9]" />
      <div className="flex items-start gap-4 bg-gray-900 px-5 py-6 text-white">
        <BrandMark theme="m5" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
        <div className="min-w-0 pt-1">
          <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">Menü</p>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-tighter">{model.name}</h1>
          <p className="mt-2 text-sm text-gray-400">{model.tagline}</p>
        </div>
      </div>
    </>
  );
}

export function HeroM6({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <>
      <CoverBlock url={coverUrl} show aspectClass="aspect-[16/10]" />
      <div className="bg-white px-5 pb-2 pt-5">
        <div className="flex flex-col items-center">
          <BrandMark theme="m6" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-gray-400">
            {model.slug}.kendisepetim.com
          </p>
          <h1 className="mt-3 text-center font-serif text-2xl font-semibold tracking-tight text-gray-900">
            {model.name}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500">{model.tagline}</p>
        </div>
        <div className="mx-auto mt-5 h-px w-16 bg-gray-300" />
      </div>
    </>
  );
}

export function HeroM7({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <>
      <CoverBlock url={coverUrl} show aspectClass="aspect-[16/9]" roundedClass="rounded-b-3xl" />
      <div className="flex items-center gap-4 bg-white px-5 py-6">
        <BrandMark theme="m7" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Menü</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{model.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{model.tagline}</p>
        </div>
      </div>
    </>
  );
}

export function HeroM8({ coverUrl, model }: { coverUrl?: string | null; model: MenuHeroModel }) {
  const initial = model.name;
  return (
    <>
      <CoverBlock url={coverUrl} show aspectClass="aspect-[4/3]" roundedClass="rounded-b-2xl" />
      <div className="-mt-6 flex justify-center px-4">
        <div className="rounded-2xl border-4 border-amber-900/15 bg-amber-50/95 p-4 shadow-md backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <BrandMark theme="m8" size="hero" logoUrl={model.logoUrl} fallbackLetter={initial} />
            <h1 className="mt-3 text-center font-serif text-xl font-semibold text-amber-950">{model.name}</h1>
            <p className="mt-1 text-center text-sm text-amber-800/80">{model.tagline}</p>
          </div>
        </div>
      </div>
    </>
  );
}
