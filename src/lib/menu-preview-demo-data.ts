import type { MenuHeroModel } from "@/components/menu-templates/menu-heroes";
import type { MenuVariantCategory } from "@/components/menu-templates/menu-variant-categories";

/** Önizleme / tema editörü için örnek restoran */
export const SAMPLE_RESTAURANT = {
  name: "Durumcu Ekrem Demo",
  slug: "durumcu-ekrem",
  tagline: "Geleneksel lezzet · Hizli servis",
  coverImageUrl:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop",
} as const;

export const SAMPLE_CATEGORIES = [
  {
    name: "Icecekler",
    items: [
      { name: "Ayran", description: "300 ml, ev yapimi", price: "45" },
      { name: "Kola", description: "330 ml kutu", price: "55" },
      { name: "Cay", description: "Ince belli bardak", price: "25" },
    ],
  },
  {
    name: "Ana yemek",
    items: [
      { name: "Izgara kofte", description: "Pilav, salata, ezme ile", price: "320" },
      { name: "Mercimek corbasi", description: "Gunluk corba", price: "95" },
      { name: "Tavuk sis", description: "Izgara, garnitur", price: "280" },
    ],
  },
] as const;

export function sampleVariantCategories(): MenuVariantCategory[] {
  return SAMPLE_CATEGORIES.map((cat, i) => ({
    id: `demo-${i}`,
    name: cat.name,
    items: cat.items.map((it, j) => ({
      id: `demo-${i}-${j}`,
      name: it.name,
      description: it.description,
      priceLabel: `${it.price} TL`,
    })),
  }));
}

export function sampleHeroModel(): MenuHeroModel {
  return {
    name: SAMPLE_RESTAURANT.name,
    slug: SAMPLE_RESTAURANT.slug,
    tagline: SAMPLE_RESTAURANT.tagline,
    logoUrl: null,
  };
}
