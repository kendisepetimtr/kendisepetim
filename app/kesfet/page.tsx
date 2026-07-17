import { redirect } from "next/navigation";

/** Eski /kesfet yolu — Restoranlar sayfasına yönlendirir. */
export default function KesfetRedirectPage() {
  redirect("/restoranlar");
}
