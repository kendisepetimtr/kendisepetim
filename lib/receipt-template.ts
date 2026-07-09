/**
 * Termal fiş şablonları — müşteri, mutfak, kurye (80/58 mm).
 */

import type { FulfillmentType } from "@/lib/fulfillment";
import { googleMapsPlaceUrl } from "@/lib/maps-links";
import type { TenantReceiptSettings } from "@/lib/receipt-settings";
import { DEFAULT_RECEIPT_SETTINGS } from "@/lib/receipt-settings";

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
  subdomain: string;
  menuUrl: string;
  orderCode: string;
  createdAt: string;
  fulfillmentType: FulfillmentType;
  fulfillmentLabel: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  items: ReceiptItemLine[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  paymentMethodLabel: string;
  paymentAtCloseLabel?: string;
  orderNote?: string;
};

export type ReceiptQrBlock = {
  url: string;
  label?: string;
};

export type ReceiptSlip = {
  kind: "customer" | "kitchen" | "courier";
  title: string;
  lines: string[];
  logoUrl?: string | null;
  useKendisepetimLogo?: boolean;
  qrBlocks?: ReceiptQrBlock[];
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

function formatTimeOnly(isoOrDisplay: string): string {
  try {
    return new Date(isoOrDisplay).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoOrDisplay;
  }
}

function pushWrapped(lines: string[], text: string, width: number, indent = "") {
  const chunk = Math.max(1, width - indent.length);
  for (let i = 0; i < text.length; i += chunk) {
    lines.push(`${indent}${text.slice(i, i + chunk)}`.slice(0, width));
  }
}

function pushItems(
  lines: string[],
  items: ReceiptItemLine[],
  width: number,
  showPrices: boolean,
) {
  for (const item of items) {
    const left = `${item.qty}x ${item.name}`;
    const right = showPrices ? formatMoney(item.lineTotal) : "";
    lines.push(alignLeftRight(left, right || " ", width));
    for (const mod of item.modifiers ?? []) {
      lines.push(`  · ${mod}`.slice(0, width));
    }
    if (item.note?.trim()) {
      lines.push(`  Not: ${item.note.trim()}`.slice(0, width));
    }
  }
}

export function renderCustomerReceiptText(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): string[] {
  const w = receiptCharWidth(settings.paperWidthMm);
  const lines: string[] = [];

  if (settings.showBusinessName) {
    lines.push(center(order.businessName || "İşletme", w));
  }

  if (settings.headerText.trim()) {
    lines.push(center(settings.headerText.trim(), w));
  }

  if (settings.showOrderCode || settings.showDateTime) {
    lines.push(repeatChar("-", w));
    const meta: string[] = [];
    if (settings.showOrderCode) meta.push(order.orderCode);
    if (settings.showDateTime) meta.push(formatDateTime(order.createdAt));
    lines.push(center(meta.join(" · "), w));
  }

  lines.push(repeatChar("=", w));
  pushItems(lines, order.items, w, settings.showItemUnitPrices);
  lines.push(repeatChar("-", w));

  if (settings.showItemUnitPrices) {
    lines.push(alignLeftRight("Ara Toplam", formatMoney(order.subtotal), w));
    if (order.deliveryFee != null && order.deliveryFee > 0) {
      lines.push(alignLeftRight("Teslimat", formatMoney(order.deliveryFee), w));
    }
    lines.push(repeatChar("=", w));
    lines.push(alignLeftRight("TOPLAM", formatMoney(order.total), w));
    lines.push(repeatChar("=", w));
  }

  if (settings.showPaymentMethod) {
    lines.push(`Ödeme: ${order.paymentMethodLabel}`.slice(0, w));
    if (order.paymentAtCloseLabel && order.paymentAtCloseLabel !== order.paymentMethodLabel) {
      lines.push(`Tahsil: ${order.paymentAtCloseLabel}`.slice(0, w));
    }
    lines.push(repeatChar("-", w));
  }

  if (settings.showKendisepetimBranding) {
    lines.push(center("Daha fazlası için", w));
    lines.push(center("kendisepetim.com", w));
  }

  if (settings.showMenuQr) {
    lines.push(center("[ QR MENÜ ]", w));
    lines.push(center(order.menuUrl.replace(/^https?:\/\//, ""), w));
  }

  if (settings.footerText.trim()) {
    lines.push("");
    lines.push(center(settings.footerText.trim(), w));
  }

  lines.push(repeatChar("=", w));
  return lines;
}

export function renderKitchenReceiptText(
  order: Pick<ReceiptOrderData, "orderCode" | "createdAt" | "fulfillmentLabel" | "items" | "orderNote">,
  settings: TenantReceiptSettings,
): string[] {
  const w = receiptCharWidth(settings.paperWidthMm);
  const lines: string[] = [
    center("MUTFAK", w),
    repeatChar("=", w),
  ];

  if (settings.kitchenShowOrderMeta) {
    lines.push(center(`${order.orderCode} · ${formatTimeOnly(order.createdAt)}`, w));
    lines.push(center(order.fulfillmentLabel.toUpperCase(), w));
    lines.push(repeatChar("-", w));
  }

  pushItems(lines, order.items, w, false);

  if (settings.kitchenShowOrderNote && order.orderNote?.trim()) {
    lines.push(repeatChar("-", w));
    lines.push("SİPARİŞ NOTU:");
    pushWrapped(lines, order.orderNote.trim(), w);
  }

  lines.push(repeatChar("=", w));
  return lines;
}

export function renderCourierReceiptText(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): string[] {
  const w = receiptCharWidth(settings.paperWidthMm);
  const lines: string[] = [
    center("KURYE FİŞİ", w),
    center(`${order.orderCode} · ${formatTimeOnly(order.createdAt)}`, w),
    repeatChar("=", w),
  ];

  pushItems(lines, order.items, w, settings.courierShowPrices);

  if (settings.courierShowPrices) {
    lines.push(repeatChar("-", w));
    lines.push(alignLeftRight("TOPLAM", formatMoney(order.total), w));
  }

  if (settings.courierShowPayment) {
    lines.push(`Ödeme: ${order.paymentMethodLabel}`.slice(0, w));
  }

  if (settings.courierShowCustomer) {
    lines.push(repeatChar("-", w));
    if (order.customerName) lines.push(`Müşteri: ${order.customerName}`.slice(0, w));
    if (order.customerPhone) lines.push(`Tel: ${order.customerPhone}`.slice(0, w));
  }

  if (settings.courierShowAddress && order.customerAddress?.trim()) {
    lines.push(repeatChar("-", w));
    lines.push("ADRES:");
    pushWrapped(lines, order.customerAddress.trim(), w);
  }

  const hasGps =
    settings.courierShowLocationQr &&
    order.customerLatitude != null &&
    order.customerLongitude != null &&
    Number.isFinite(order.customerLatitude) &&
    Number.isFinite(order.customerLongitude);

  if (hasGps) {
    lines.push(repeatChar("-", w));
    lines.push(center("[ QR KONUM ]", w));
    lines.push(center("Google Maps", w));
  }

  if (settings.courierShowOrderNote && order.orderNote?.trim()) {
    lines.push(repeatChar("-", w));
    lines.push("SİPARİŞ NOTU:");
    pushWrapped(lines, order.orderNote.trim(), w);
  }

  lines.push(repeatChar("=", w));
  return lines;
}

export function buildReceiptSlips(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): ReceiptSlip[] {
  const slips: ReceiptSlip[] = [];

  if (settings.customerReceiptEnabled) {
    const copies = Math.min(3, Math.max(1, settings.customerCopies));
    const menuQr: ReceiptQrBlock[] =
      settings.showMenuQr && order.menuUrl
        ? [{ url: order.menuUrl, label: order.menuUrl.replace(/^https?:\/\//, "") }]
        : [];

    for (let i = 0; i < copies; i++) {
      slips.push({
        kind: "customer",
        title: copies > 1 ? `Müşteri fişi (${i + 1}/${copies})` : "Müşteri fişi",
        lines: renderCustomerReceiptText(order, settings),
        qrBlocks: menuQr.length > 0 ? menuQr : undefined,
      });
    }
  }

  if (settings.kitchenReceiptEnabled) {
    slips.push({
      kind: "kitchen",
      title: "Mutfak fişi",
      lines: renderKitchenReceiptText(order, settings),
    });
  }

  if (settings.courierReceiptEnabled && order.fulfillmentType === "delivery") {
    const hasGps =
      order.customerLatitude != null &&
      order.customerLongitude != null &&
      Number.isFinite(order.customerLatitude) &&
      Number.isFinite(order.customerLongitude);

    const qrBlocks: ReceiptQrBlock[] = [];
    if (settings.courierShowLocationQr && hasGps) {
      qrBlocks.push({
        url: googleMapsPlaceUrl(order.customerLatitude!, order.customerLongitude!),
        label: "Konum — Google Maps",
      });
    }

    slips.push({
      kind: "courier",
      title: "Kurye fişi",
      lines: renderCourierReceiptText(order, settings),
      useKendisepetimLogo: true,
      qrBlocks,
    });
  }

  return slips;
}

/** @deprecated Eski tek fiş API — buildReceiptSlips kullanın */
export function renderThermalReceiptText(
  order: ReceiptOrderData,
  settings: TenantReceiptSettings,
): string[] {
  return renderCustomerReceiptText(order, settings);
}

/** @deprecated Eski mutfak API */
export function renderKitchenTicketText(
  order: Pick<ReceiptOrderData, "orderCode" | "createdAt" | "fulfillmentLabel" | "items" | "orderNote">,
  paperWidthMm: ReceiptPaperWidth,
): string[] {
  return renderKitchenReceiptText(order, {
    ...DEFAULT_RECEIPT_SETTINGS,
    paperWidthMm,
    kitchenReceiptEnabled: true,
  });
}

export function sampleReceiptOrder(businessName: string, subdomain = "ornek-restoran"): ReceiptOrderData {
  const menuUrl = `https://${subdomain}.kendisepetim.com`;
  return {
    businessName: businessName || "Örnek Restoran",
    subdomain,
    menuUrl,
    orderCode: "KS-1042",
    createdAt: "2026-06-27T14:32:00",
    fulfillmentType: "delivery",
    fulfillmentLabel: "Paket",
    customerName: "Ayşe Yılmaz",
    customerPhone: "0532 000 00 00",
    customerAddress: "Caferağa Mah. Moda Cad. No:12 D:3 Kadıköy / İstanbul",
    customerLatitude: 40.9876,
    customerLongitude: 29.0234,
    items: [
      {
        qty: 2,
        name: "Karışık Izgara",
        unitPrice: 320,
        lineTotal: 640,
        modifiers: ["1,5 Porsiyon", "Soğansız"],
      },
      { qty: 1, name: "Ayran", unitPrice: 35, lineTotal: 35 },
    ],
    subtotal: 675,
    deliveryFee: 0,
    total: 675,
    paymentMethodLabel: "Kapıda nakit",
    orderNote: "Kapı zili çalışmıyor, lütfen arayın.",
  };
}
