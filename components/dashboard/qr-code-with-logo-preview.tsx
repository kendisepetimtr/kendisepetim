"use client";

import {
  createQrPngWithCenterLogo,
  defaultKendiSepetimLogoUrl,
  qrCodeApiUrl,
} from "@/lib/qr-with-logo";
import { useEffect, useState } from "react";

type QrCodeWithLogoPreviewProps = {
  menuUrl: string;
  /** Boşsa KendiSepetim logosu kullanılır */
  tenantLogoDataUrl: string;
  displaySize?: number;
  className?: string;
};

export default function QrCodeWithLogoPreview({
  menuUrl,
  tenantLogoDataUrl,
  displaySize = 240,
  className = "",
}: QrCodeWithLogoPreviewProps) {
  const [src, setSrc] = useState(() => qrCodeApiUrl(menuUrl, displaySize));
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    const plain = qrCodeApiUrl(menuUrl, displaySize);
    setSrc(plain);
    const logoSrc = tenantLogoDataUrl.trim() ? tenantLogoDataUrl : defaultKendiSepetimLogoUrl();
    void createQrPngWithCenterLogo(menuUrl, displaySize, logoSrc).then((dataUrl) => {
      if (!alive) return;
      if (dataUrl) setSrc(dataUrl);
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [menuUrl, tenantLogoDataUrl, displaySize]);

  return (
    <div className={`relative shrink-0 ${className}`}>
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 text-xs font-medium text-secondary backdrop-blur-[1px]">
          QR hazırlanıyor…
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={displaySize}
        height={displaySize}
        className={`rounded-xl border border-surface-container-high bg-white object-contain transition-opacity duration-200 ${busy ? "opacity-60" : "opacity-100"}`}
        style={{ width: displaySize, height: displaySize }}
      />
    </div>
  );
}
