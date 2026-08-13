import { redirect } from "next/navigation";
import { MUSTERI_HOME_PATH } from "@/lib/musteri/paths";

/** Eski /kesfet yolu — müşteri keşfet sayfasına yönlendirir. */
export default function KesfetRedirectPage() {
  redirect(MUSTERI_HOME_PATH);
}
