import Link from "next/link";
import type { MenuFabTheme } from "@/lib/menu-layout";
import { MenuVariantPhone } from "@/components/menu-templates/menu-variant-phone";
import { SAMPLE_RESTAURANT, sampleHeroModel, sampleVariantCategories } from "@/lib/menu-preview-demo-data";

const COVER = SAMPLE_RESTAURANT.coverImageUrl;

const VARIANTS: MenuFabTheme[] = ["m1", "m3", "m5", "m6", "m7", "m8"];

const BANNERS: Record<MenuFabTheme, { n: number; title: string; desc: string }> = {
  m1: { n: 1, title: "Klasik zarif", desc: "Kapak + ortada logo; FAB’da artı. Yelpaze animasyon." },
  m3: { n: 2, title: "Koyu premium", desc: "Logo kapak üzerinde; FAB’da artı. Yelpaze animasyon." },
  m5: { n: 3, title: "Editorial", desc: "Geniş kapak + şeritte logo; FAB’da marka. Yelpaze animasyon." },
  m6: { n: 4, title: "OneQR", desc: "Sticky kategori çubuğu ve liste satırları." },
  m7: { n: 5, title: "Nordic minimal", desc: "Kapak yok örneği (placeholder); satır başı logo. FAB’da üç çizgi." },
  m8: { n: 6, title: "Rustik", desc: "Kapak + çerçeveli logo kartı; FAB’da marka. Yelpaze animasyon." },
};

function VariantBanner({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="mb-4 border-b border-dashed border-gray-300 bg-violet-50 px-4 py-2 text-xs text-violet-950">
      <span className="font-bold">Menu V{n}:</span> {title}
      <span className="text-violet-800"> — {desc}</span>
    </div>
  );
}

export function MenuPreviewVariants() {
  const categories = sampleVariantCategories();
  const model = sampleHeroModel();

  return (
    <div className="space-y-14 pb-24">
      <div className="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="text-lg font-semibold text-gray-900">Müşteri menüsü — UI önizleme</h1>
        <p className="text-xs text-gray-600">
          Altı tutulan tema (V1, V2, V3, V4, V5, V6). Tema sayfasında da aynı şablonlar seçilebilir. Hızlı işlemler sağ
          altta; açılış animasyonu yelpaze. Sadece geliştirme.
        </p>
        <nav className="mt-2 flex flex-wrap gap-2 text-xs">
          {VARIANTS.map((id) => (
            <a
              key={id}
              href={`#menu-${id}`}
              className="rounded-md bg-white px-2 py-1 font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              {id === "m1" ? "V1" : id === "m3" ? "V2" : id === "m5" ? "V3" : id === "m6" ? "V4" : id === "m7" ? "V5" : "V6"}
            </a>
          ))}
          <Link href="/" className="rounded-md px-2 py-1 text-gray-600 underline">
            Ana sayfa
          </Link>
        </nav>
      </div>

      {VARIANTS.map((variant) => {
        const b = BANNERS[variant];
        const coverForVariant = variant === "m7" ? null : COVER;
        return (
          <section key={variant} id={`menu-${variant}`} className="scroll-mt-24">
            <VariantBanner n={b.n} title={b.title} desc={b.desc} />
            <MenuVariantPhone
              variant={variant}
              model={model}
              coverUrl={coverForVariant}
              categories={categories}
              fontHeading="playfair_display"
              fontBody="source_sans_3"
              surfaceColor="#ffffff"
              brandColor="#1f2937"
              accentColor="#d97706"
              caption={null}
            />
          </section>
        );
      })}
    </div>
  );
}
