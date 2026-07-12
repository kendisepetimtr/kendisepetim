import { redirect } from "next/navigation";

/** Gel-al sekmesi kaldırıldı — ana kasa tahtasındaki Gel-Al slotlarına yönlendir. */
export default async function KasaPickupOrdersPage() {
  redirect("/kasa");
}
