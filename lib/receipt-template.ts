/**
 * Standart 80 mm termal fiş şablonu (Yemeksepeti / Getir tarzı ESC-POS düzeni).
 *
 * Kağıt: 80 mm ≈ 48 karakter (Font A, 12 cpi) · 58 mm ≈ 32 karakter
 * Yazdırma entegrasyonu bu satır listesini ESC/POS komutlarına dönüştürecek.
 */

import type { TenantReceiptSettings } from "@/lib/receipt-settings";

export type ReceiptPaperWidth = 58 | 80;

export type ReceiptItemLine = {
  qty: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
  modifiers?: string[];
  note?: string;
};

export type ReceiptOrderData = {
  businessName: string;
  orderCode: string;
  createdAt: string;
  fulfillmentLabel: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: ReceiptItemLine[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  paymentMethodLabel: string;
  paymentAtCloseLabel?: string;
  orderNote?: string;
};

export function receiptCharWidth(paperWidthMm: ReceiptPaperWidth): number {
  return paperWidthMm === 58 ? 32 : 48;
}

function repeatChar(ch: string, width: number): string {
  return ch.repeat(Math.max(1, width));
}

function center(text: string, width: number): string {
  const t = text.trim();
  if (t.length >= width) return t.slice(0, width);
  const pad = Math.floor((width - t.length) / 2);
  return " ".repeat(pad) + t;
}

function alignLeftRight(left: string, right: string, width: number): string {
  const r = right.trim();
  const maxLeft = Math.max(1, width - r.length - 1);
  const l = left.trim().length > maxLeft ? `${left.trim().slice(0, maxLeft - 1)}…` : left.trim();
  const gap = width - l.length - r.length;
  return l + " ".repeat(Math.max(1, gap)) + r;
}

function formatMoney(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} TL`;
}

function formatDateTime(isoOrDisplay: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}/.test(isoOrDisplay)) return isoOrDisplay;
  try {
    return new Date(isoOrDisplay).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoOrDisplay;
  }
}

export type ThermalReceiptBlock =
  | { kind: "blank" }
  | { kind: "rule"; style: "single" | "double" }
  | { kind: "center"; text: string; emphasis?: "normal" | "bold" | "large" }
  | { kind: "line"; text: string; emphasis?: "normal" | "bold" }
  | { kind: "pair"; left: string; right: string; emphasis?: "normal" | "bold" }
  | { kind: "indent"; text: string };

export function buildThermalReceiptBlocks(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): ThermalReceiptBlock[] {
  const blocks: ThermalReceiptBlock[] = [];
  const w = receiptCharWidth(settings.paperWidthMm);

  if (settings.showLogo) {
    blocks.push({ kind: "center", text: "[ LOGO ]", emphasis: "normal" });
    blocks.push({ kind: "blank" });
  }

  if (settings.showBusinessName) {
    blocks.push({ kind: "center", text: order.businessName || "İşletme", emphasis: "large" });
  }

  if (settings.headerText.trim()) {
    blocks.push({ kind: "center", text: settings.headerText.trim() });
  }

  blocks.push({ kind: "rule", style: "double" });

  if (settings.showOrderCode) {
    blocks.push({ kind: "line", text: `SİPARİŞ NO: ${order.orderCode}`, emphasis: "bold" });
  }

  if (settings.showDateTime) {
    blocks.push({ kind: "line", text: `Tarih: ${formatDateTime(order.createdAt)}` });
  }

  if (settings.showTableNumber && order.fulfillmentLabel) {
    blocks.push({ kind: "line", text: `Tip: ${order.fulfillmentLabel.toUpperCase()}`, emphasis: "bold" });
  }

  blocks.push({ kind: "rule", style: "single" });

  if (settings.showCustomerInfo) {
    if (order.customerName) {
      blocks.push({ kind: "line", text: `Müşteri: ${order.customerName}` });
    }
    if (order.customerPhone) {
      blocks.push({ kind: "line", text: `Tel: ${order.customerPhone}` });
    }
    if (order.customerAddress?.trim()) {
      blocks.push({ kind: "line", text: "Adres:" });
      const addr = order.customerAddress.trim();
      for (let i = 0; i < addr.length; i += w) {
        blocks.push({ kind: "indent", text: addr.slice(i, i + w) });
      }
    }
    if (order.customerName || order.customerPhone || order.customerAddress) {
      blocks.push({ kind: "rule", style: "single" });
    }
  }

  for (const item of order.items) {
    const left = `${item.qty}x ${item.name}`;
    const right = settings.showItemUnitPrices ? formatMoney(item.lineTotal) : "";
    blocks.push({
      kind: "pair",
      left,
      right: right || " ",
      emphasis: "normal",
    });

    for (const mod of item.modifiers ?? []) {
      blocks.push({ kind: "indent", text: `- ${mod}` });
    }
    if (item.note?.trim()) {
      blocks.push({ kind: "indent", text: `Not: ${item.note.trim()}` });
    }
  }

  blocks.push({ kind: "rule", style: "single" });

  blocks.push({
    kind: "pair",
    left: "Ara Toplam",
    right: formatMoney(order.subtotal),
  });

  if (order.deliveryFee != null && order.deliveryFee > 0) {
    blocks.push({
      kind: "pair",
      left: "Teslimat",
      right: formatMoney(order.deliveryFee),
    });
  }

  blocks.push({ kind: "rule", style: "double" });
  blocks.push({
    kind: "pair",
    left: "TOPLAM",
    right: formatMoney(order.total),
    emphasis: "bold",
  });
  blocks.push({ kind: "rule", style: "double" });

  if (settings.showPaymentMethod) {
    blocks.push({ kind: "line", text: `Ödeme: ${order.paymentMethodLabel}`, emphasis: "bold" });
    if (order.paymentAtCloseLabel && order.paymentAtCloseLabel !== order.paymentMethodLabel) {
      blocks.push({ kind: "line", text: `Tahsil: ${order.paymentAtCloseLabel}` });
    }
  }

  if (settings.showOrderNote && order.orderNote?.trim()) {
    blocks.push({ kind: "rule", style: "single" });
    blocks.push({ kind: "line", text: "Sipariş Notu:" });
    const note = order.orderNote.trim();
    for (let i = 0; i < note.length; i += w) {
      blocks.push({ kind: "indent", text: note.slice(i, i + w) });
    }
  }

  blocks.push({ kind: "rule", style: "single" });

  if (settings.footerText.trim()) {
    blocks.push({ kind: "center", text: settings.footerText.trim() });
  }

  blocks.push({ kind: "blank" });
  blocks.push({ kind: "center", text: "KendiSepetim", emphasis: "normal" });

  return blocks;
}

export function renderThermalReceiptText(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): string[] {
  const w = receiptCharWidth(settings.paperWidthMm);
  const blocks = buildThermalReceiptBlocks(order, settings);
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.kind === "blank") {
      lines.push("");
      continue;
    }
    if (block.kind === "rule") {
      lines.push(repeatChar(block.style === "double" ? "=" : "-", w));
      continue;
    }
    if (block.kind === "center") {
      lines.push(center(block.text, w));
      continue;
    }
    if (block.kind === "line") {
      lines.push(block.text.slice(0, w));
      continue;
    }
    if (block.kind === "pair") {
      lines.push(alignLeftRight(block.left, block.right, w));
      continue;
    }
    if (block.kind === "indent") {
      lines.push(`  ${block.text}`.slice(0, w));
    }
  }

  return lines;
}

/** Dashboard önizlemesi için örnek paket siparişi */
export function sampleReceiptOrder(businessName: string): ReceiptOrderData {
  return {
    businessName: businessName || "Örnek Restoran",
    orderCode: "KS-1042",
    createdAt: "2026-06-27T14:32:00",
    fulfillmentLabel: "Paket",
    customerName: "Ayşe Yılmaz",
    customerPhone: "0532 000 00 00",
    customerAddress: "Caferağa Mah. Moda Cad. No:12 D:3 Kadıköy / İstanbul",
    items: [
      {
        qty: 2,
        name: "Karışık Izgara",
        unitPrice: 320,
        lineTotal: 640,
        modifiers: ["Soğansız"],
      },
      { qty: 1, name: "Ayran", unitPrice: 35, lineTotal: 35 },
    ],
    subtotal: 675,
    deliveryFee: 0,
    total: 675,
    paymentMethodLabel: "Nakit",
    orderNote: "Kapı zili çalışmıyor, lütfen arayın.",
  };
}

/** Mutfak fişi — fiyat yok, YS mutfak çıktısı tarzı */
export function renderKitchenTicketText(
  order: Pick<ReceiptOrderData, "orderCode" | "createdAt" | "fulfillmentLabel" | "items" | "orderNote">,
  paperWidthMm: ReceiptPaperWidth,
): string[] {
  const w = receiptCharWidth(paperWidthMm);
  const lines: string[] = [
    center("MUTFAK", w),
    center("***", w),
    repeatChar("=", w),
    `NO: ${order.orderCode}`,
    formatDateTime(order.createdAt),
    order.fulfillmentLabel.toUpperCase(),
    repeatChar("-", w),
  ];

  for (const item of order.items) {
    lines.push(`${item.qty}x ${item.name}`.slice(0, w));
    for (const mod of item.modifiers ?? []) {
      lines.push(`  - ${mod}`.slice(0, w));
    }
  }

  if (order.orderNote?.trim()) {
    lines.push(repeatChar("-", w));
    lines.push("NOT:");
    const note = order.orderNote.trim();
    for (let i = 0; i < note.length; i += w) {
      lines.push(note.slice(i, i + w));
    }
  }

  lines.push(repeatChar("=", w));
  return lines;
}
