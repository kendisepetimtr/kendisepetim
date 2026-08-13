import { redirect } from "next/navigation";
import { musteriLoginWithNext } from "@/lib/musteri/paths";
import { loadMusteriSession } from "@/lib/musteri/session";

/** Misafiri girişe zorlar; kayıtlı müşteri userId döner. */
export async function requireMusteriCustomer(nextPath: string): Promise<string> {
  const session = await loadMusteriSession();
  if (session.kind !== "customer" || !session.userId) {
    redirect(musteriLoginWithNext(nextPath));
  }
  return session.userId;
}
