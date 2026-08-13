import MusteriAuthGate from "@/components/musteri/musteri-auth-gate";
import { signOutDashboardSession } from "@/lib/dashboard/sign-out";
import { MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";
import { loadMusteriSession } from "@/lib/musteri/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MusteriLayout({ children }: { children: React.ReactNode }) {
  const session = await loadMusteriSession();
  if (session.blocked) {
    await signOutDashboardSession();
    redirect(`${MUSTERI_LOGIN_PATH}?durum=hesap-engelli`);
  }
  return <MusteriAuthGate session={session}>{children}</MusteriAuthGate>;
}
