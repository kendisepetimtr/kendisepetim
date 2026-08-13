import GateHome from "@/components/landing/gate-home";
import { AUTH_CALLBACK_PATH, DEFAULT_POST_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { getCanonicalSiteUrl, isLocalHost } from "@/lib/site-url";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AUTH_INTENT_COOKIE, parseAuthIntent } from "@/lib/auth-intent";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description: "Yemek sipariş ver veya restoranını dijitalleştir. İki kapı, iki hesap.",
};

type Props = {
  searchParams?: Promise<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
};

/** Supabase bazen kodu /?code=... olarak birakir; oturum acmak icin callback'e yonlendir. */
export default async function Home({ searchParams }: Props) {
  const q = searchParams ? await searchParams : {};
  const intent = parseAuthIntent((await cookies()).get(AUTH_INTENT_COOKIE)?.value);

  if (typeof q.code === "string" && q.code.trim()) {
    const next =
      typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//")
        ? q.next
        : intent === "customer"
          ? MUSTERI_HOME_PATH
          : DEFAULT_POST_LOGIN_PATH;
    const callbackPath = `${AUTH_CALLBACK_PATH}?code=${encodeURIComponent(q.code.trim())}&next=${encodeURIComponent(next)}`;

    const h = await headers();
    const host = h.get("host") ?? "";
    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    if (isLocalHost(hostname)) {
      redirect(`${getCanonicalSiteUrl()}${callbackPath}`);
    }

    redirect(callbackPath);
  }

  if (typeof q.error === "string" && q.error) {
    const mesaj =
      typeof q.error_description === "string" && q.error_description
        ? q.error_description
        : q.error;
    redirect(
      `${intent === "customer" ? MUSTERI_LOGIN_PATH : "/giris"}?durum=oauth-hata&mesaj=${encodeURIComponent(mesaj)}`,
    );
  }

  return <GateHome />;
}
