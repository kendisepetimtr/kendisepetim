"use client";

import { t } from "@/lib/menu-i18n";
import { useState } from "react";

/** Restoran içeriğinin ikinci dili henüz kaydedilmez; yalnızca yer tutucu. */
export default function LanguageAddStub() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
      >
        {t("addLanguage", "tr")} · EN
      </button>
      {open ? (
        <p className="mt-1 rounded-lg border border-dashed border-surface-container-highest bg-surface-container-low/60 px-2.5 py-2 text-[11px] leading-relaxed text-secondary">
          {t("languageComingSoon", "tr")}
        </p>
      ) : null}
    </div>
  );
}
