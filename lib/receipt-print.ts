/**
 * Tarayıcı üzerinden termal fiş yazdırma — müşteri, mutfak, kurye fişleri.
 */

import type { TenantReceiptSettings } from "@/lib/receipt-settings";
import { buildReceiptSlips, type ReceiptOrderData, type ReceiptSlip } from "@/lib/receipt-template";
import { qrCodeApiUrl } from "@/lib/qr-with-logo";

export type ReceiptPrintOptions = {
  settings: TenantReceiptSettings;
  logoUrl?: string | null;
  kendisepetimLogoUrl?: string;
};

function paperCssWidth(mm: 58 | 80): string {
  return mm === 58 ? "58mm" : "80mm";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function renderLogoBlock(src: string | null | undefined, alt: string): string {
  if (!src) {
    return `<div style="text-align:center;font-size:10px;color:#888;margin-bottom:6px;">[ LOGO ]</div>`;
  }
  return `<div style="text-align:center;margin-bottom:8px;"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="max-height:52px;max-width:72%;" /></div>`;
}

function renderQrBlocks(blocks: ReceiptSlip["qrBlocks"]): string {
  if (!blocks?.length) return "";
  return blocks
    .map((block) => {
      const qrSrc = qrCodeApiUrl(block.url, 140);
      const label = block.label ? `<div style="margin-top:4px;font-size:10px;">${escapeHtml(block.label)}</div>` : "";
      return `<div style="text-align:center;margin:10px 0 4px;">
        <img src="${escapeAttr(qrSrc)}" alt="" width="110" height="110" style="image-rendering:pixelated;" />
        ${label}
      </div>`;
    })
    .join("");
}

function renderSlipHtml(slip: ReceiptSlip, options: ReceiptPrintOptions, isFirst: boolean): string {
  const { settings, logoUrl, kendisepetimLogoUrl } = options;
  const body = slip.lines.map((l) => escapeHtml(l)).join("\n");

  let logoBlock = "";
  if (slip.kind === "customer" && settings.showLogo) {
    logoBlock = renderLogoBlock(logoUrl, "İşletme logosu");
  } else if (slip.useKendisepetimLogo) {
    logoBlock = renderLogoBlock(kendisepetimLogoUrl ?? "/ks-logo.png", "KendiSepetim");
  }

  const pageBreak = isFirst ? "" : "page-break-before:always;";

  return `<section style="${pageBreak}margin-top:8px;padding-top:4px;">
${logoBlock}
<pre style="white-space:pre-wrap;word-break:break-word;margin:0;">${body}</pre>
${renderQrBlocks(slip.qrBlocks)}
</section>`;
}

function buildPrintHtml(slips: ReceiptSlip[], options: ReceiptPrintOptions): string {
  const { settings } = options;
  const width = paperCssWidth(settings.paperWidthMm);
  const sections = slips
    .map((slip, index) => renderSlipHtml(slip, options, index === 0))
    .join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Fiş</title>
<style>
  @page { margin: 2mm; size: ${width} auto; }
  body { width: ${width}; margin: 0 auto; padding: 2mm 3mm; font-family: "Courier New", Courier, monospace; font-size: 11px; line-height: 1.35; color: #000; background: #fff; }
  pre { font-family: inherit; font-size: inherit; }
</style>
</head><body>
${sections}
</body></html>`;
}

export function printThermalReceipt(
  order: ReceiptOrderData,
  options: ReceiptPrintOptions,
): boolean {
  if (typeof window === "undefined") return false;
  const { settings } = options;
  if (!settings.enabled) return false;

  const slips = buildReceiptSlips(order, settings);
  if (slips.length === 0) return false;

  const html = buildPrintHtml(slips, options);
  const popup = window.open("", "_blank", "width=420,height=900");
  if (!popup) {
    window.alert("Yazdırma penceresi açılamadı. Tarayıcı açılır pencereyi engelliyor olabilir.");
    return false;
  }

  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

export async function fetchKasaReceiptPrintOptions(): Promise<ReceiptPrintOptions | null> {
  try {
    const res = await fetch("/api/kasa/receipt-settings", { cache: "no-store" });
    const data = (await res.json()) as {
      ok?: boolean;
      settings?: ReceiptPrintOptions["settings"];
      logoUrl?: string | null;
      subdomain?: string;
    };
    if (!res.ok || !data.ok || !data.settings) return null;
    return {
      settings: data.settings,
      logoUrl: data.logoUrl ?? null,
      kendisepetimLogoUrl:
        typeof window !== "undefined" ? `${window.location.origin}/ks-logo.png` : "/ks-logo.png",
    };
  } catch {
    return null;
  }
}

export async function fetchDashboardReceiptPrintOptions(): Promise<ReceiptPrintOptions | null> {
  try {
    const res = await fetch("/api/dashboard/receipt-settings", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as {
      ok?: boolean;
      settings?: ReceiptPrintOptions["settings"];
      logoUrl?: string | null;
      subdomain?: string;
    };
    if (!res.ok || !data.ok || !data.settings) return null;
    return {
      settings: data.settings,
      logoUrl: data.logoUrl ?? null,
      kendisepetimLogoUrl:
        typeof window !== "undefined" ? `${window.location.origin}/ks-logo.png` : "/ks-logo.png",
    };
  } catch {
    return null;
  }
}
