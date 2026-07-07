/**
 * Tarayıcı üzerinden termal fiş yazdırma (burger34x Admin paneli ile aynı yaklaşım).
 * Windows'ta varsayılan termal yazıcı seçiliyken doğrudan 80 mm kağıda basılır.
 */

import type { TenantReceiptSettings } from "@/lib/receipt-settings";
import {
  renderKitchenTicketText,
  renderThermalReceiptText,
  type ReceiptOrderData,
} from "@/lib/receipt-template";

export type ReceiptPrintOptions = {
  settings: TenantReceiptSettings;
  logoUrl?: string | null;
};

function paperCssWidth(mm: 58 | 80): string {
  return mm === 58 ? "58mm" : "80mm";
}

function buildPrintHtml(
  lines: string[],
  kitchenLines: string[],
  options: ReceiptPrintOptions,
): string {
  const { settings, logoUrl } = options;
  const width = paperCssWidth(settings.paperWidthMm);
  const body = lines.map((l) => escapeHtml(l)).join("\n");
  const kitchen =
    kitchenLines.length > 0
      ? `<div style="page-break-before:always;margin-top:8px;">${kitchenLines.map((l) => escapeHtml(l)).join("\n")}</div>`
      : "";

  const logoBlock =
    settings.showLogo && logoUrl
      ? `<div style="text-align:center;margin-bottom:8px;"><img src="${escapeAttr(logoUrl)}" alt="" style="max-height:48px;max-width:70%;" /></div>`
      : settings.showLogo
        ? `<div style="text-align:center;font-size:10px;color:#888;margin-bottom:6px;">[ LOGO ]</div>`
        : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Fiş</title>
<style>
  @page { margin: 2mm; size: ${width} auto; }
  body { width: ${width}; margin: 0 auto; padding: 2mm 3mm; font-family: "Courier New", Courier, monospace; font-size: 11px; line-height: 1.35; color: #000; background: #fff; }
  pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; font-size: inherit; }
</style>
</head><body>
${logoBlock}
<pre>${body}</pre>
${kitchen ? `<pre>${kitchen}</pre>` : ""}
</body></html>`;
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

export function printThermalReceipt(
  order: ReceiptOrderData,
  options: ReceiptPrintOptions,
): boolean {
  if (typeof window === "undefined") return false;
  const { settings } = options;
  if (!settings.enabled) return false;

  const lines = renderThermalReceiptText(order, settings);
  const kitchenLines = settings.kitchenTicketEnabled
    ? renderKitchenTicketText(order, settings.paperWidthMm)
    : [];

  const html = buildPrintHtml(lines, kitchenLines, options);
  const copies = Math.min(3, Math.max(1, settings.copies));

  for (let c = 0; c < copies; c++) {
    const popup = window.open("", "_blank", "width=400,height=720");
    if (!popup) {
      window.alert("Yazdırma penceresi açılamadı. Tarayıcı açılır pencereyi engelliyor olabilir.");
      return false;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
    if (c < copies - 1) {
      popup.close();
    }
  }

  return true;
}

export async function fetchKasaReceiptPrintOptions(): Promise<ReceiptPrintOptions | null> {
  try {
    const res = await fetch("/api/kasa/receipt-settings", { cache: "no-store" });
    const data = (await res.json()) as {
      ok?: boolean;
      settings?: TenantReceiptSettings;
      logoUrl?: string | null;
    };
    if (!res.ok || !data.ok || !data.settings) return null;
    return { settings: data.settings, logoUrl: data.logoUrl ?? null };
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
      settings?: TenantReceiptSettings;
      logoUrl?: string | null;
    };
    if (!res.ok || !data.ok || !data.settings) return null;
    return { settings: data.settings, logoUrl: data.logoUrl ?? null };
  } catch {
    return null;
  }
}
