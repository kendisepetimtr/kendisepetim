import { redirect } from "next/navigation";
import { MUSTERI_HOME_PATH } from "@/lib/musteri/paths";

/** Eski /restoranlar yolu — müşteri keşfet sayfasına yönlendirir. */
export default function RestoranlarRedirectPage() {
  redirect(MUSTERI_HOME_PATH);
}
