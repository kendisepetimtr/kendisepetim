import { redirect } from "next/navigation";

export default async function DashboardPaketRedirectPage() {
  redirect("/dashboard?nav=orders");
}
