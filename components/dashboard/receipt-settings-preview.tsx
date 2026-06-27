"use client";

import {
  renderKitchenTicketText,
  renderThermalReceiptText,
  sampleReceiptOrder,
} from "@/lib/receipt-template";
import type { TenantReceiptSettings } from "@/lib/receipt-settings";

type ReceiptSettingsPreviewProps = {
  businessName: string;
  settings: TenantReceiptSettings;
};

export default function ReceiptSettingsPreview({ businessName, settings }: ReceiptSettingsPreviewProps) {
  const widthClass = settings.paperWidthMm === 58 ? "max-w-[14rem]" : "max-w-[19rem]";
  const order = sampleReceiptOrder(businessName);
  const lines = renderThermalReceiptText(order, settings);
  const kitchenLines = settings.kitchenTicketEnabled
    ? renderKitchenTicketText(order, settings.paperWidthMm)
    : [];

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
        Termal fiş önizlemesi (80 mm standart)
      </p>
      <p className="mt-0.5 text-[11px] text-secondary">
        Yemeksepeti / Getir tarzı düzen — gerçek yazıcıda ESC/POS ile aynı hizada basılır.
      </p>

      <div
        className={`mt-3 mx-auto rounded-sm border border-on-background/10 bg-[#fafaf8] px-3 py-4 font-mono text-[10px] leading-[1.35] text-on-background shadow-inner sm:text-[11px] ${widthClass}`}
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        {lines.map((line, i) => (
          <p
            key={i}
            className={[
              "whitespace-pre",
              line === order.businessName || line.includes("TOPLAM") ? "font-bold" : "",
              line.startsWith("SİPARİŞ") || line.startsWith("Tip:") ? "font-bold" : "",
            ].join(" ")}
          >
            {line || "\u00A0"}
          </p>
        ))}
      </div>

      {kitchenLines.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Mutfak fişi</p>
          <div
            className={`mt-2 mx-auto rounded-sm border border-amber-500/30 bg-amber-50 px-3 py-3 font-mono text-[10px] leading-[1.35] text-amber-950 ${widthClass}`}
          >
            {kitchenLines.map((line, i) => (
              <p key={i} className="whitespace-pre">
                {line || "\u00A0"}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
