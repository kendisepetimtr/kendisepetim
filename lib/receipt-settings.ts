/**
 * Fiş şablonu ayarları — standart 80 mm termal (Yemeksepeti / Getir tarzı).
 *
 * Düzen: ortalanmış işletme adı → çift çizgi → sipariş no / tarih / tip →
 * müşteri bloğu → kalemler (adet×ürün + sağda tutar) → ara toplam →
 * teslimat (varsa) → TOPLAM → ödeme → sipariş notu → alt metin.
 *
 * Yazdırma: lib/receipt-template.ts satır listesi → ESC/POS (sonraki faz).
 */

export type TenantReceiptSettings = {
  enabled: boolean;
  autoPrintOnPayment: boolean;
  copies: number;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showBusinessName: boolean;
  showOrderCode: boolean;
  showDateTime: boolean;
  showCustomerInfo: boolean;
  showPaymentMethod: boolean;
  showTableNumber: boolean;
  showOrderNote: boolean;
  showItemUnitPrices: boolean;
  kitchenTicketEnabled: boolean;
  paperWidthMm: 58 | 80;
};

export const DEFAULT_RECEIPT_SETTINGS: TenantReceiptSettings = {
  enabled: false,
  autoPrintOnPayment: true,
  copies: 1,
  headerText: "",
  footerText: "Afiyet olsun!",
  showLogo: true,
  showBusinessName: true,
  showOrderCode: true,
  showDateTime: true,
  showCustomerInfo: true,
  showPaymentMethod: true,
  showTableNumber: true,
  showOrderNote: true,
  showItemUnitPrices: true,
  kitchenTicketEnabled: false,
  paperWidthMm: 80,
};

export function parseReceiptSettings(raw: unknown): TenantReceiptSettings {
  const base = DEFAULT_RECEIPT_SETTINGS;
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const width = Number(o.paperWidthMm);
  return {
    enabled: o.enabled === true,
    autoPrintOnPayment: o.autoPrintOnPayment !== false,
    copies: typeof o.copies === "number" && o.copies >= 1 && o.copies <= 3 ? Math.round(o.copies) : base.copies,
    headerText: typeof o.headerText === "string" ? o.headerText : base.headerText,
    footerText: typeof o.footerText === "string" ? o.footerText : base.footerText,
    showLogo: o.showLogo !== false,
    showBusinessName: o.showBusinessName !== false,
    showOrderCode: o.showOrderCode !== false,
    showDateTime: o.showDateTime !== false,
    showCustomerInfo: o.showCustomerInfo !== false,
    showPaymentMethod: o.showPaymentMethod !== false,
    showTableNumber: o.showTableNumber !== false,
    showOrderNote: o.showOrderNote !== false,
    showItemUnitPrices: o.showItemUnitPrices !== false,
    kitchenTicketEnabled: o.kitchenTicketEnabled === true,
    paperWidthMm: width === 58 ? 58 : 80,
  };
}
