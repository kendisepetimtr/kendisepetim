import RestaurantLanding from "@/components/landing/restaurant-landing";
import { DEFAULT_POST_LOGIN_PATH, AUTH_CALLBACK_PATH } from "@/lib/supabase/auth-urls";
import { getCanonicalSiteUrl, isLocalHost } from "@/lib/site-url";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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

  if (typeof q.code === "string" && q.code.trim()) {
    const next =
      typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//")
        ? q.next
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
    redirect(`/giris?durum=oauth-hata&mesaj=${encodeURIComponent(mesaj)}`);
  }

  return <RestaurantLanding />;
}
