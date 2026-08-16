import MusteriAuthGate from "@/components/musteri/musteri-auth-gate";
import MusteriExplore from "@/components/musteri/musteri-explore";
import { AUTH_CALLBACK_PATH, DEFAULT_POST_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { getCanonicalSiteUrl, isLocalHost } from "@/lib/site-url";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AUTH_INTENT_COOKIE, parseAuthIntent } from "@/lib/auth-intent";
import { MUSTERI_HOME_PATH, MUSTERI_LOGIN_PATH } from "@/lib/musteri/paths";
import { isPartnerHost } from "@/lib/partner/host";
import { fetchMarketplaceListings } from "@/lib/marketplace-query";
import { loadMusteriSession } from "@/lib/musteri/session";
import { signOutDashboardSession } from "@/lib/dashboard/sign-out";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yakınınızdaki mutfak, kendi sepetiniz",
  description:
    "Mahallenizdeki restoranlardan gel-al veya işletme teslimatı ile sipariş verin. KendiSepetim.",
};

type Props = {
  searchParams?: Promise<{
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
};

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

  const host = (await headers()).get("host");
  if (isPartnerHost(host)) {
    redirect("/kayit");
  }

  const session = await loadMusteriSession();
  if (session.blocked) {
    await signOutDashboardSession();
    redirect(`${MUSTERI_LOGIN_PATH}?durum=hesap-engelli`);
  }

  const listings = await fetchMarketplaceListings();
  return (
    <MusteriAuthGate session={session}>
      <MusteriExplore initialListings={listings} isCustomer={session.kind === "customer"} />
    </MusteriAuthGate>
  );
}
