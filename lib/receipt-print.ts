/**
 * Tarayıcı üzerinden termal fiş yazdırma — müşteri, mutfak, kurye fişleri.
 *
 * Termal yazıcılarda tarayıcı baskısı için kritik noktalar:
 * - Satır genişliği `ch` ile karakter sayısına kilitlenir (kayma/taşma önlenir)
 * - Ayırıcılar karakter (`---` / `===`) değil CSS çizgi (wrap + silik tire önlenir)
 * - Kalın + biraz büyütülmüş font (zayıf baskıyı azaltır)
 * - `white-space: pre` — satır ortasından kırılmaz
 */

import type { TenantReceiptSettings } from "@/lib/receipt-settings";
import {
  buildReceiptSlips,
  RECEIPT_LR_SEP,
  type ReceiptOrderData,
  type ReceiptSlip,
} from "@/lib/receipt-template";
import { qrCodeApiUrl } from "@/lib/qr-with-logo";

export type ReceiptPrintOptions = {
  settings: TenantReceiptSettings;
  logoUrl?: string | null;
  kendisepetimLogoUrl?: string;
};

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
    return `<div class="logo-fallback">[ LOGO ]</div>`;
  }
  return `<div class="logo"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" /></div>`;
}

function renderQrBlocks(blocks: ReceiptSlip["qrBlocks"]): string {
  if (!blocks?.length) return "";
  return blocks
    .map((block) => {
      const qrSrc = qrCodeApiUrl(block.url, 140);
      const label = block.label ? `<div class="qr-label">${escapeHtml(block.label)}</div>` : "";
      return `<div class="qr">
        <img src="${escapeAttr(qrSrc)}" alt="" width="110" height="110" />
        ${label}
      </div>`;
    })
    .join("");
}

/** Tire/eşittir satırlarını CSS çizgiye çevir — termalde kayma ve silik karakter önlenir */
function renderLinesHtml(lines: string[]): string {
  return lines
    .map((line) => {
      if (/^=+$/.test(line)) return `<div class="rule rule-eq" aria-hidden="true"></div>`;
      if (/^-+$/.test(line)) return `<div class="rule rule-dash" aria-hidden="true"></div>`;
      if (line.length === 0) return `<div class="line">&nbsp;</div>`;
      const tab = line.indexOf(RECEIPT_LR_SEP);
      if (tab >= 0) {
        const left = line.slice(0, tab);
        const right = line.slice(tab + 1);
        return `<div class="row"><span class="left">${escapeHtml(left)}</span><span class="right">${escapeHtml(right)}</span></div>`;
      }
      return `<div class="line">${escapeHtml(line)}</div>`;
    })
    .join("\n");
}

function renderSlipHtml(slip: ReceiptSlip, options: ReceiptPrintOptions, isFirst: boolean): string {
  const { settings, logoUrl, kendisepetimLogoUrl } = options;

  let logoBlock = "";
  if (slip.kind === "customer" && settings.showLogo) {
    logoBlock = renderLogoBlock(logoUrl, "İşletme logosu");
  } else if (slip.useKendisepetimLogo) {
    logoBlock = renderLogoBlock(kendisepetimLogoUrl ?? "/ks-logo.png", "KendiSepetim");
  }

  const pageBreak = isFirst ? "" : " page-break-before:always;";

  return `<section class="slip" style="${pageBreak}">
${logoBlock}
${renderLinesHtml(slip.lines)}
${renderQrBlocks(slip.qrBlocks)}
</section>`;
}

function buildPrintHtml(slips: ReceiptSlip[], options: ReceiptPrintOptions): string {
  const { settings } = options;
  const fontPx = settings.paperWidthMm === 58 ? 11 : 12;
  const sections = slips
    .map((slip, index) => renderSlipHtml(slip, options, index === 0))
    .join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Fiş</title>
<style>
  @page {
    margin: 0;
    size: ${settings.paperWidthMm}mm auto;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    width: ${settings.paperWidthMm}mm;
    max-width: 100%;
    margin: 0 auto;
    padding: ${settings.marginTopMm}mm ${settings.marginRightMm}mm 4mm ${settings.marginLeftMm}mm;
    font-family: "Courier New", Courier, "Lucida Console", monospace;
    font-size: ${fontPx}px;
    font-weight: 700;
    line-height: 1.22;
    letter-spacing: 0;
    font-variant-ligatures: none;
    -webkit-font-smoothing: none;
  }
  .slip { margin: 0; padding: 0; }
  .line {
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    text-shadow: 0.2px 0 0 #000;
  }
  .row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    text-shadow: 0.2px 0 0 #000;
  }
  .row .left {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .row .right {
    flex: 0 0 auto;
    text-align: right;
    white-space: nowrap;
  }
  .rule {
    display: block;
    width: 100%;
    margin: 3px 0;
    padding: 0;
    border: 0;
    height: 0;
  }
  .rule-dash {
    border-top: 1.75px solid #000;
  }
  .rule-eq {
    border-top: 2.5px solid #000;
    border-bottom: 1.25px solid #000;
    padding-bottom: 2px;
    margin: 4px 0;
  }
  .logo {
    text-align: center;
    margin: 0 0 6px;
  }
  .logo img {
    max-height: 48px;
    max-width: 70%;
    filter: contrast(1.15);
  }
  .logo-fallback {
    text-align: center;
    font-size: 10px;
    margin-bottom: 6px;
  }
  .qr {
    text-align: center;
    margin: 8px 0 4px;
  }
  .qr img {
    width: 110px;
    height: 110px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .qr-label {
    margin-top: 3px;
    font-size: 10px;
    font-weight: 700;
  }
</style>
</head><body>
${sections}
</body></html>`;
}

function waitForImages(doc: Document, timeoutMs = 2500): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    let remaining = images.length;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    for (const img of images) {
      if (img.complete) {
        done();
        continue;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  });
}

export const RECEIPT_PREVIEW_EVENT = "ks-receipt-preview";

export type ReceiptPreviewDetail = {
  html: string;
  heading: string;
};

export function openReceiptPreview(html: string, heading: string): boolean {
  if (typeof window === "undefined") return false;
  window.dispatchEvent(
    new CustomEvent<ReceiptPreviewDetail>(RECEIPT_PREVIEW_EVENT, { detail: { html, heading } }),
  );
  return true;
}

export async function printReceiptHtml(html: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  await waitForImages(doc);
  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    return true;
  } catch {
    return false;
  } finally {
    window.setTimeout(() => iframe.remove(), 60_000);
  }
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
  const heading = [order.dailyLabel, order.orderCode].filter(Boolean).join(" · ");
  return openReceiptPreview(html, heading || "Fiş");
}

export async function fetchKasaReceiptPrintOptions(): Promise<ReceiptPrintOptions | null> {
  try {
    const res = await fetch("/api/kasa/receipt-settings", {
      cache: "no-store",
      credentials: "include",
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
