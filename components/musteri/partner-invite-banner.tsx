"use client";

import { PARTNER_PRODUCTION_ORIGIN } from "@/lib/partner/host";
import { dismissPartnerBanner, isPartnerBannerDismissed } from "@/lib/partner-banner";
import { useEffect, useState } from "react";

export default function PartnerInviteBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isPartnerBannerDismissed());
  }, []);

  if (!visible) return null;

  return (
    <div className="border-b border-primary/20 bg-primary/8 px-3 py-2">
      <div className="mx-auto flex max-w-6xl items-center gap-2 sm:px-2">
        <p className="min-w-0 flex-1 text-xs font-semibold text-on-background sm:text-sm">
          Restoran mısınız?{" "}
          <a href={PARTNER_PRODUCTION_ORIGIN} className="font-extrabold text-primary underline-offset-2 hover:underline">
            Partnerimiz olun
          </a>
        </p>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-white/70"
          aria-label="Kapat"
          onClick={() => {
            dismissPartnerBanner();
            setVisible(false);
          }}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
