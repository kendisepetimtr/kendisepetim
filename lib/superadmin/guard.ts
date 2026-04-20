import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SUPERADMIN_COOKIE, verifySuperadminToken } from "@/lib/superadmin/session";

export async function requireSuperadminOrRedirect(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SUPERADMIN_COOKIE)?.value;
  if (!verifySuperadminToken(raw)) {
    redirect("/superadmin/giris");
  }
}

export async function getSuperadminSessionValid(): Promise<boolean> {
  const jar = await cookies();
  return verifySuperadminToken(jar.get(SUPERADMIN_COOKIE)?.value);
}
