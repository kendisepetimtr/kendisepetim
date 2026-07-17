import { redirect } from "next/navigation";
import { getSuperadminAuthUser } from "@/lib/superadmin/auth";

export async function requireSuperadminOrRedirect(): Promise<void> {
  const user = await getSuperadminAuthUser();
  if (!user) {
    redirect("/superadmin/giris");
  }
}

export async function getSuperadminSessionValid(): Promise<boolean> {
  return (await getSuperadminAuthUser()) != null;
}
