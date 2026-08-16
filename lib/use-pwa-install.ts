"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallController = {
  isInstalled: boolean;
  isIos: boolean;
  showIosHelp: boolean;
  statusText: string;
  buttonLabel: string;
  handleInstallClick: () => Promise<void>;
  dismissIosHelp: () => void;
  openIosHelp: () => void;
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

export function usePwaInstall(options: {
  registerSw: boolean;
  installedMessage: string;
}): PwaInstallController {
  const isIos = useSyncExternalStore(subscribeNoop, isIosDevice, () => false);
  const installedFromStore = useSyncExternalStore(subscribeInstalledStatus, isStandaloneMode, () => false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installAccepted, setInstallAccepted] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [statusText, setStatusText] = useState("");
  const isInstalled = installAccepted || installedFromStore;

  useEffect(() => {
    if (!options.registerSw || !canRegisterServiceWorker()) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, [options.registerSw]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setStatusText("");
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallAccepted(true);
      setShowIosHelp(false);
      setStatusText(options.installedMessage);
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
  }, [options.installedMessage]);

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
        "Tarayıcınız otomatik yükleme açmadı. Tarayıcı menüsünden «Ana ekrana ekle» / «Uygulama yükle» seçin.",
      );
      return;
    }

    setStatusText("");
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setInstallAccepted(true);
      setStatusText(options.installedMessage);
      return;
    }

    setStatusText("Yükleme iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.");
  }

  const buttonLabel = isInstalled ? "Yüklü" : isIos ? "Nasıl eklenir?" : "Uygulama";

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
