import { redirect } from "next/navigation";

/** Eski yer imleri: masalar artık Siparişler → Masa Siparişleri altında. */
export default function DashboardMasalarRedirectPage() {
  redirect("/dashboard/orders?channel=table");
}
