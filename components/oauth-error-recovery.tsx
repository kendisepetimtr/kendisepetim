"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Supabase OAuth hatalari bazen Site URL'e (#error=...) fragment olarak duser. */
export default function OAuthErrorRecovery() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;

    const hashParams = new URLSearchParams(hash.slice(1));
    const error = hashParams.get("error_description") ?? hashParams.get("error");
    if (!error) return;

    const target = new URL("/giris", window.location.origin);
    target.searchParams.set("durum", "oauth-hata");
    target.searchParams.set("mesaj", error);
    if (pathname !== "/giris") {
      router.replace(`${target.pathname}${target.search}`);
    } else {
      window.history.replaceState(null, "", `${target.pathname}${target.search}`);
    }
  }, [pathname, router]);

  return null;
}
