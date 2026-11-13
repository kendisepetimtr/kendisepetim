import { redirect } from "next/navigation";

export default async function DashboardGelAlRedirectPage() {
  redirect("/dashboard?nav=orders");
}
