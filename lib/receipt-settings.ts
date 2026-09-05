/**
 * Fiş şablonu ayarları — 3 ayrı fiş tipi (müşteri, mutfak, kurye).
 */

export type TenantReceiptSettings = {
  enabled: boolean;
  autoPrintOnNewOrder: boolean;
  autoPrintOnPayment: boolean;
  paperWidthMm: 58 | 80;
  /** Yazdırılabilir alan kenarları (mm) — sağ pay fiyatların kesilmesini önler */
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;

  customerReceiptEnabled: boolean;
  customerCopies: number;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showBusinessName: boolean;
  showOrderCode: boolean;
  showDateTime: boolean;
  showPaymentMethod: boolean;
  showItemUnitPrices: boolean;
  showMenuQr: boolean;
  showKendisepetimBranding: boolean;

  kitchenReceiptEnabled: boolean;
  kitchenShowOrderMeta: boolean;
  kitchenShowOrderNote: boolean;

  courierReceiptEnabled: boolean;
  courierShowPrices: boolean;
  courierShowPayment: boolean;
  courierShowCustomer: boolean;
  courierShowAddress: boolean;
  courierShowLocationQr: boolean;
  courierShowOrderNote: boolean;
};

export const DEFAULT_RECEIPT_SETTINGS: TenantReceiptSettings = {
  enabled: false,
  autoPrintOnNewOrder: true,
  autoPrintOnPayment: true,
  paperWidthMm: 80,
  marginLeftMm: 2.5,
  marginRightMm: 7,
  marginTopMm: 2,

  customerReceiptEnabled: true,
  customerCopies: 1,
  headerText: "",
  footerText: "Afiyet olsun!",
  showLogo: true,
  showBusinessName: true,
  showOrderCode: true,
  showDateTime: true,
  showPaymentMethod: true,
  showItemUnitPrices: true,
  showMenuQr: true,
  showKendisepetimBranding: true,

  kitchenReceiptEnabled: true,
  kitchenShowOrderMeta: true,
  kitchenShowOrderNote: true,

  courierReceiptEnabled: true,
  courierShowPrices: true,
  courierShowPayment: true,
  courierShowCustomer: true,
  courierShowAddress: true,
  courierShowLocationQr: true,
  courierShowOrderNote: true,
};

function readBool(o: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof o[key] === "boolean" ? (o[key] as boolean) : fallback;
}

function readMm(o: Record<string, unknown>, key: string, fallback: number): number {
  const n = Number(o[key]);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(12, Math.max(0, Math.round(n * 10) / 10));
}

export function parseReceiptSettings(raw: unknown): TenantReceiptSettings {
  const base = DEFAULT_RECEIPT_SETTINGS;
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const width = Number(o.paperWidthMm);
  const copiesRaw = typeof o.customerCopies === "number" ? o.customerCopies : o.copies;
  const copies =
    typeof copiesRaw === "number" && copiesRaw >= 1 && copiesRaw <= 3 ? Math.round(copiesRaw) : base.customerCopies;

  const kitchenEnabled =
    typeof o.kitchenReceiptEnabled === "boolean"
      ? o.kitchenReceiptEnabled
      : o.kitchenTicketEnabled === true;

  return {
    enabled: o.enabled === true,
    autoPrintOnNewOrder: o.autoPrintOnNewOrder !== false,
    autoPrintOnPayment: o.autoPrintOnPayment !== false,
    paperWidthMm: width === 58 ? 58 : 80,
    marginLeftMm: readMm(o, "marginLeftMm", base.marginLeftMm),
    marginRightMm: readMm(o, "marginRightMm", base.marginRightMm),
    marginTopMm: readMm(o, "marginTopMm", base.marginTopMm),

    customerReceiptEnabled: o.customerReceiptEnabled !== false,
    customerCopies: copies,
    headerText: typeof o.headerText === "string" ? o.headerText : base.headerText,
    footerText: typeof o.footerText === "string" ? o.footerText : base.footerText,
    showLogo: readBool(o, "showLogo", base.showLogo),
    showBusinessName: readBool(o, "showBusinessName", base.showBusinessName),
    showOrderCode: readBool(o, "showOrderCode", base.showOrderCode),
    showDateTime: readBool(o, "showDateTime", base.showDateTime),
    showPaymentMethod: readBool(o, "showPaymentMethod", base.showPaymentMethod),
    showItemUnitPrices: readBool(o, "showItemUnitPrices", base.showItemUnitPrices),
    showMenuQr: o.showMenuQr !== false,
    showKendisepetimBranding: o.showKendisepetimBranding !== false,

    kitchenReceiptEnabled: kitchenEnabled,
    kitchenShowOrderMeta: o.kitchenShowOrderMeta !== false,
    kitchenShowOrderNote: readBool(o, "kitchenShowOrderNote", o.showOrderNote !== false),

    courierReceiptEnabled: o.courierReceiptEnabled !== false,
    courierShowPrices: o.courierShowPrices !== false,
    courierShowPayment: o.courierShowPayment !== false,
    courierShowCustomer: o.courierShowCustomer !== false,
    courierShowAddress: o.courierShowAddress !== false,
    courierShowLocationQr: o.courierShowLocationQr !== false,
    courierShowOrderNote: o.courierShowOrderNote !== false,
  };
}
