import { redirect } from "next/navigation";

export default async function DashboardPaketOrderRedirectPage() {
  redirect("/dashboard?nav=orders");
}
