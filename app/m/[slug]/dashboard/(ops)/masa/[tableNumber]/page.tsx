import { redirect } from "next/navigation";

export default async function DashboardMasaRedirectPage() {
  redirect("/dashboard?nav=orders");
}