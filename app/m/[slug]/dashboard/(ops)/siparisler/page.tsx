import { redirect } from "next/navigation";

/** Eski full-page tahta — Dashboard gömülü Siparişler sekmesine yönlendir. */
export default async function DashboardSiparislerRedirectPage() {
  redirect("/dashboard?nav=orders");
}
