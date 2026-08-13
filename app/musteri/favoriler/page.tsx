import MusteriFavorites from "@/components/musteri/musteri-favorites";
import { loadCustomerFavorites } from "@/lib/musteri/favorites-service";
import { requireMusteriCustomer } from "@/lib/musteri/require-customer";
import { MUSTERI_FAVORITES_PATH } from "@/lib/musteri/paths";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Favoriler",
};

export default async function MusteriFavoritesPage() {
  const userId = await requireMusteriCustomer(MUSTERI_FAVORITES_PATH);
  const items = await loadCustomerFavorites(userId);
  return <MusteriFavorites isCustomer initialItems={items} />;
}
