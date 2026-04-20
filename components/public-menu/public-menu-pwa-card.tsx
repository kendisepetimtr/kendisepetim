"use client";

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
      setStatusText("Menu telefonuna eklendi. Artik ana ekrandan acabilirsin.");
    };

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setInstallAccepted(true);
        setInstallPrompt(null);
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

  async function handleInstallClick() {
    if (isInstalled) return;

    if (isIos) {
      setShowIosHelp((prev) => !prev);
      setStatusText("");
      return;
    }

    if (!installPrompt) {
      setStatusText("Tarayiciniz otomatik yukleme acmadi. Tarayici menusunden ana ekrana ekleyebilirsiniz.");
      return;
    }

    setStatusText("");
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setInstallAccepted(true);
      setStatusText("Menu telefonuna eklendi. Artik ana ekrandan acabilirsin.");
      return;
    }

    setStatusText("Yukleme iptal edildi. Istedigin zaman tekrar deneyebilirsin.");
  }

  const buttonLabel = isInstalled ? "Ana ekranda hazir" : isIos ? "Ana ekrana ekle" : "Telefona ekle";

  return {
    isInstalled,
    isIos,
    showIosHelp,
    statusText,
    buttonLabel,
    handleInstallClick,
  };
}

export default function PublicMenuPwaCard({
  businessName,
  controller,
  showAction = true,
}: PublicMenuPwaCardProps) {
  const { isInstalled, showIosHelp, statusText, buttonLabel, handleInstallClick } = controller;

  return (
    <section className="rounded-3xl border border-surface-container-highest bg-surface-container-lowest px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-background">Telefona ekle</p>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            {businessName} menusunu ana ekrana ekleyip uygulama gibi acabilirsiniz. Son gorulen menu ekranlari
            cevirdisiyken de tekrar acilabilir.
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
              {isInstalled ? "check_circle" : "download"}
            </span>
          </button>
        ) : null}
      </div>

      {showIosHelp ? (
        <div className="mt-3 rounded-2xl bg-surface-container-low px-3 py-3 text-xs leading-relaxed text-secondary">
          iPhone ve iPad cihazlarda butona bastiktan sonra Safari paylas menusunu acin, sonra
          &quot;Ana Ekrana Ekle&quot; secenegini kullanin.
        </div>
      ) : null}

      {statusText ? (
        <p className="mt-3 text-xs leading-relaxed text-secondary">{statusText}</p>
      ) : null}

      {!isInstalled ? (
        <p className="mt-3 text-[11px] leading-relaxed text-secondary">
          Not: Cevrimdisi modda yalnizca son gorulen menu icerigi acilir; siparis gonderimi internet baglantisi
          gerektirir.
        </p>
      ) : null}
    </section>
  );
}
