import { redirect } from "next/navigation";

/** Eski sipariş URL'leri — ana kasa / paket modalına yönlendir. */
export default async function KasaNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const sp = await searchParams;
  const channel = (sp.channel ?? "").toLowerCase();
  if (channel === "paket" || channel === "delivery") {
    redirect("/kasa/paket");
  }
  redirect("/kasa");
}
