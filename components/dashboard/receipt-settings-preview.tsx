"use client";

import {
  buildReceiptSlips,
  renderCourierReceiptText,
  renderCustomerReceiptText,
  renderKitchenReceiptText,
  sampleReceiptOrder,
} from "@/lib/receipt-template";
import type { TenantReceiptSettings } from "@/lib/receipt-settings";

type ReceiptSettingsPreviewProps = {
  businessName: string;
  subdomain?: string;
  settings: TenantReceiptSettings;
};

function SlipPreview({
  title,
  lines,
  tone = "default",
  widthClass,
}: {
  title: string;
  lines: string[];
  tone?: "default" | "kitchen" | "courier";
  widthClass: string;
}) {
  const toneClass =
    tone === "kitchen"
      ? "border-amber-500/30 bg-amber-50 text-amber-950"
      : tone === "courier"
        ? "border-sky-500/30 bg-sky-50 text-sky-950"
        : "border-on-background/10 bg-[#fafaf8] text-on-background";

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{title}</p>
      <div
        className={`mt-2 mx-auto rounded-sm border px-3 py-4 font-mono text-[10px] leading-[1.35] shadow-inner sm:text-[11px] ${toneClass} ${widthClass}`}
        style={{ fontFamily: '"Courier New", Courier, monospace' }}
      >
        {lines.map((line, i) => (
          <p key={i} className="whitespace-pre">
            {line || "\u00A0"}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ReceiptSettingsPreview({
  businessName,
  subdomain = "ornek-restoran",
  settings,
}: ReceiptSettingsPreviewProps) {
  const widthClass = settings.paperWidthMm === 58 ? "max-w-[14rem]" : "max-w-[19rem]";
  const order = sampleReceiptOrder(businessName, subdomain);
  const slips = buildReceiptSlips(order, settings);

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
        Fiş önizlemesi ({settings.paperWidthMm} mm)
      </p>
      <p className="mt-0.5 text-[11px] text-secondary">
        Yazdırma sırası: müşteri → mutfak → kurye (paket siparişlerde). QR kodlar gerçek yazdırmada görünür.
      </p>

      {settings.customerReceiptEnabled ? (
        <SlipPreview
          title="1 · Müşteri fişi"
          lines={renderCustomerReceiptText(order, settings)}
          widthClass={widthClass}
        />
      ) : null}

      {settings.kitchenReceiptEnabled ? (
        <SlipPreview
          title="2 · Mutfak fişi"
          lines={renderKitchenReceiptText(order, settings)}
          tone="kitchen"
          widthClass={widthClass}
        />
      ) : null}

      {settings.courierReceiptEnabled && order.fulfillmentType === "delivery" ? (
        <SlipPreview
          title="3 · Kurye fişi"
          lines={renderCourierReceiptText(order, settings)}
          tone="courier"
          widthClass={widthClass}
        />
      ) : null}

      {slips.length === 0 ? (
        <p className="mt-4 text-xs text-secondary">Hiç fiş tipi seçili değil.</p>
      ) : null}
    </div>
  );
}
