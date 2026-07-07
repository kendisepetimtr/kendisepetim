"use client";

import { PWA_INSTALL_GUIDE_VIDEO_SRC } from "@/lib/pwa-install-assets";
import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => onStoreChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type PwaInstallGuideVideoProps = {
  className?: string;
  /** iOS yardım paneli açıldığında oynatmayı zorla */
  playWhenVisible?: boolean;
  ariaLabel?: string;
};

export default function PwaInstallGuideVideo({
  className = "",
  playWhenVisible = true,
  ariaLabel = "Ana ekrana ekleme adımları videosu",
}: PwaInstallGuideVideoProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion || !playWhenVisible) return;
    void video.play().catch(() => undefined);
  }, [playWhenVisible, reducedMotion]);

  if (reducedMotion) {
    return (
      <div
        className={[
          "flex aspect-[9/16] max-h-64 w-full items-center justify-center rounded-2xl bg-surface-container-low text-center",
          className,
        ].join(" ")}
      >
        <p className="px-4 text-xs leading-relaxed text-secondary">
          Hareket azaltma açık. Safari&apos;de Paylaş → Ana Ekrana Ekle adımlarını aşağıdan takip edin.
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={PWA_INSTALL_GUIDE_VIDEO_SRC}
      className={["w-full rounded-2xl bg-black object-contain", className].join(" ")}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={ariaLabel}
    />
  );
}
