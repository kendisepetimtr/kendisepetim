import { cookies, headers } from "next/headers";
import { AUTH_INTENT_COOKIE, authIntentCookieSetOptions, type AuthIntent } from "@/lib/auth-intent";

export async function persistAuthIntent(intent: AuthIntent): Promise<void> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0] ?? "";
  const jar = await cookies();
  jar.set(AUTH_INTENT_COOKIE, intent, authIntentCookieSetOptions(host));
}
