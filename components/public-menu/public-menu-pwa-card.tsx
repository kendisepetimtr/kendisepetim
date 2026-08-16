"use client";

import PwaInstallGuideVideo from "@/components/public-menu/pwa-install-guide-video";
import { isRestaurantMenuPwaHost } from "@/lib/pwa-host";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { useEffect, useState } from "react";

export type PublicMenuPwaInstallController = {
  isInstalled: boolean;
  isIos: boolean;
  showIosHelp: boolean;
  statusText: string;
  buttonLabel: string;
  handleInstallClick: () => Promise<void>;
  dismissIosHelp: () => void;
  openIosHelp: () => void;
};

type PublicMenuPwaCardProps = {
  businessName: string;
  controller: PublicMenuPwaInstallController;
  showAction?: boolean;
};

export function usePublicMenuPwaInstall(): PublicMenuPwaInstallController {
  const [onRestaurantHost, setOnRestaurantHost] = useState(false);
  useEffect(() => {
    setOnRestaurantHost(isRestaurantMenuPwaHost(window.location.host));
  }, []);

  return usePwaInstall({
    registerSw: onRestaurantHost,
    installedMessage: "Menü telefonunuza eklendi. Artık ana ekrandan açabilirsiniz.",
  });
}

export default function PublicMenuPwaCard({
  businessName,
  controller,
  showAction = true,
}: PublicMenuPwaCardProps) {
  const { isInstalled, isIos, showIosHelp, statusText, buttonLabel, handleInstallClick } = controller;

  return (
    <section className="rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-background">Telefona ekle</p>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            {businessName} menüsünü ana ekrana ekleyip uygulama gibi açabilirsiniz. Son görülen menü ekranları
            çevrimdışıyken de tekrar açılabilir.
          </p>
        </div>
        {showAction ? (
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            disabled={isInstalled}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition",
              isInstalled
                ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-primary/15 bg-primary/8 text-primary hover:bg-primary/12",
            ].join(" ")}
          >
            {buttonLabel}
            <span className="material-symbols-outlined text-[16px]">
              {isInstalled ? "check_circle" : isIos ? "help" : "download"}
            </span>
          </button>
        ) : null}
      </div>

      {!isInstalled && !isIos ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-surface-container-highest bg-black/5">
          <p className="bg-surface-container-low px-3 py-2 text-[11px] font-semibold text-secondary">
            Kurulum videosu — adımları takip edin
          </p>
          <PwaInstallGuideVideo className="max-h-48" />
        </div>
      ) : null}

      {isIos && !showIosHelp && !isInstalled ? (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-3 py-3 text-xs font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">play_circle</span>
          iPhone&apos;da nasıl eklenir? Videolu rehberi aç
        </button>
      ) : null}

      {statusText ? (
        <p className="mt-3 text-xs leading-relaxed text-secondary">{statusText}</p>
      ) : null}

      {!isInstalled ? (
        <p className="mt-3 text-[11px] leading-relaxed text-secondary">
          Not: Çevrimdışı modda yalnızca son görülen menü içeriği açılır; sipariş gönderimi internet bağlantısı
          gerektirir.
        </p>
      ) : null}
    </section>
  );
}
