"use client";

import { isMarketplacePwaHost } from "@/lib/pwa-host";
import { useEffect } from "react";

/** Ana site PWA: Chrome yükleme için service worker gerekir. */
export default function MarketplacePwaRuntime() {
  useEffect(() => {
    if (!isMarketplacePwaHost(window.location.host)) return;
    if (!("serviceWorker" in navigator)) return;
    const secure =
      window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!secure) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
