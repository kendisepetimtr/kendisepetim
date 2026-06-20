"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  buildAuthCallbackRedirectUrl,
  readAuthCode,
  readOAuthErrorMessage,
  urlHasAuthCallbackParams,
  urlHasOAuthError,
} from "@/lib/oauth-redirect";
import { AUTH_CALLBACK_PATH } from "@/lib/supabase/auth-urls";
import { getCanonicalSiteUrl, isLocalHost } from "@/lib/site-url";

/**
 * Supabase OAuth donusunu duzeltir:
 * - localhost'a dusen kod/hata → canli site
 * - /?code=... → /auth/callback?code=...
 * - hata → /giris
 */
export default function OAuthErrorRecovery() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { origin, hostname, search, hash, pathname: path } = window.location;
    if (!urlHasAuthCallbackParams(search, hash)) return;

    const canonical = getCanonicalSiteUrl();
    if (canonical && isLocalHost(hostname)) {
      const bounce = `${canonical}${path}${search}${hash}`;
      if (bounce !== `${origin}${path}${search}${hash}`) {
        window.location.replace(bounce);
        return;
      }
    }

    const code = readAuthCode(search);
    if (code && path !== AUTH_CALLBACK_PATH) {
      router.replace(buildAuthCallbackRedirectUrl(origin, search));
      return;
    }

    if (!urlHasOAuthError(search, hash)) return;

    const error = readOAuthErrorMessage(search, hash);
    if (!error) return;

    const target = new URL("/giris", origin);
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
