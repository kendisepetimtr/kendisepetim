import { redirect } from "next/navigation";

export default function SuperAdminHomePage() {
  redirect("/admin/restaurants");
}
