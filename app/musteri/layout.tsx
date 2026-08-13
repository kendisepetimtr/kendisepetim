import MusteriAuthGate from "@/components/musteri/musteri-auth-gate";
import { loadMusteriSession } from "@/lib/musteri/session";

export const dynamic = "force-dynamic";

export default async function MusteriLayout({ children }: { children: React.ReactNode }) {
  const session = await loadMusteriSession();
  return <MusteriAuthGate session={session}>{children}</MusteriAuthGate>;
}
