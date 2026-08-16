"use client";

import PwaIosInstallHelp from "@/components/public-menu/pwa-ios-install-help";
import { isMarketplacePwaHost } from "@/lib/pwa-host";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { useMenuT } from "@/lib/use-menu-locale";
import { useEffect, useState } from "react";

export default function MarketplacePwaButton() {
  const { t } = useMenuT();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isMarketplacePwaHost(window.location.host));
  }, []);

  const pwa = usePwaInstall({
    registerSw: enabled,
    installedMessage: "KendiSepetim ana ekranınıza eklendi.",
  });

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void pwa.handleInstallClick()}
        disabled={pwa.isInstalled}
        className={[
          "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition",
          pwa.isInstalled
            ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-primary/20 bg-primary/8 text-primary hover:bg-primary/12",
        ].join(" ")}
        aria-label={pwa.buttonLabel}
        title={pwa.buttonLabel}
      >
        <span className="material-symbols-outlined text-[18px]">
          {pwa.isInstalled ? "check_circle" : pwa.isIos ? "help" : "download"}
        </span>
        <span className="hidden sm:inline">{pwa.isInstalled ? t("appInstalled") : t("app")}</span>
      </button>
      {pwa.isIos && pwa.showIosHelp && !pwa.isInstalled ? (
        <PwaIosInstallHelp businessName="KendiSepetim" variant="sheet" onDismiss={pwa.dismissIosHelp} />
      ) : null}
    </>
  );
}
