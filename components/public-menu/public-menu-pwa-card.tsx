"use client";

import PwaInstallGuideVideo from "@/components/public-menu/pwa-install-guide-video";
import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(ua) || touchMac;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function canRegisterServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  return window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function subscribeNoop(): () => void {
  return () => undefined;
}

function subscribeInstalledStatus(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(display-mode: standalone)");
  const handleInstalled = () => onStoreChange();
  const handleMediaChange = () => onStoreChange();
  window.addEventListener("appinstalled", handleInstalled);
  media.addEventListener("change", handleMediaChange);
  return () => {
    window.removeEventListener("appinstalled", handleInstalled);
    media.removeEventListener("change", handleMediaChange);
  };
}

export function usePublicMenuPwaInstall(): PublicMenuPwaInstallController {
  const isIos = useSyncExternalStore(subscribeNoop, isIosDevice, () => false);
  const installedFromStore = useSyncExternalStore(subscribeInstalledStatus, isStandaloneMode, () => false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installAccepted, setInstallAccepted] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [statusText, setStatusText] = useState("");
  const isInstalled = installAccepted || installedFromStore;

  useEffect(() => {
    if (!canRegisterServiceWorker()) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setInstallPrompt(promptEvent);
      setStatusText("");
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallAccepted(true);
      setShowIosHelp(false);
      setStatusText("Menü telefonunuza eklendi. Artık ana ekrandan açabilirsiniz.");
    };

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setInstallAccepted(true);
        setInstallPrompt(null);
        setShowIosHelp(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    media.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
      media.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  function openIosHelp() {
    setShowIosHelp(true);
    setStatusText("");
  }

  function dismissIosHelp() {
    setShowIosHelp(false);
  }

  async function handleInstallClick() {
    if (isInstalled) return;

    if (isIos) {
      setShowIosHelp(true);
      setStatusText("");
      return;
    }

    if (!installPrompt) {
      setStatusText(
        "Tarayıcınız otomatik yükleme açmadı. Aşağıdaki videodaki adımları izleyin veya tarayıcı menüsünden ana ekrana ekleyin.",
      );
      return;
    }

    setStatusText("");
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setInstallAccepted(true);
      setStatusText("Menü telefonunuza eklendi. Artık ana ekrandan açabilirsiniz.");
      return;
    }

    setStatusText("Yükleme iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.");
  }

  const buttonLabel = isInstalled ? "Ana ekranda hazır" : isIos ? "Nasıl eklenir?" : "Telefona ekle";

  return {
    isInstalled,
    isIos,
    showIosHelp,
    statusText,
    buttonLabel,
    handleInstallClick,
    dismissIosHelp,
    openIosHelp,
  };
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
