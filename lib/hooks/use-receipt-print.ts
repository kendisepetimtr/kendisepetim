"use client";

import { receiptSettingsForKasaChannel } from "@/lib/kasa/receipt-channel";
import { adminOrderToReceiptData, sessionOrdersToReceiptData } from "@/lib/receipt-order-map";
import type { AdminOrder } from "@/lib/orders";
import {
  fetchDashboardReceiptPrintOptions,
  fetchKasaReceiptPrintOptions,
  printThermalReceipt,
  type ReceiptPrintOptions,
} from "@/lib/receipt-print";
import type { CheckoutPaymentMethod, MealCardBrandId } from "@/lib/tenant-payment";
import { useCallback, useRef } from "react";

type PaymentClose = {
  method: CheckoutPaymentMethod;
  mealCardBrandId?: MealCardBrandId;
};

async function fetchDashboardOrderById(orderId: string): Promise<AdminOrder | null> {
  try {
    const res = await fetch(`/api/dashboard/orders?orderId=${encodeURIComponent(orderId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; order?: AdminOrder };
    if (!res.ok || !data.ok || !data.order) return null;
    return data.order;
  } catch {
    return null;
  }
}

/** Kasa: panel ayarlarından bağımsız yazdırabilir; kanal bazlı fiş seti uygulanır. */
function optionsForKasaOrder(
  base: ReceiptPrintOptions,
  order: AdminOrder,
): ReceiptPrintOptions {
  return {
    ...base,
    settings: receiptSettingsForKasaChannel(base.settings, order.fulfillmentType),
  };
}

export function useKasaReceiptPrint(businessName: string, subdomain: string) {
  const optionsRef = useRef<ReceiptPrintOptions | null>(null);

  const loadOptions = useCallback(async (force = false) => {
    if (!optionsRef.current || force) {
      optionsRef.current = await fetchKasaReceiptPrintOptions();
    }
    return optionsRef.current;
  }, []);

  const printOrder = useCallback(
    async (order: AdminOrder, paymentAtClose?: PaymentClose, opts?: { silent?: boolean }) => {
      const base = await loadOptions();
      if (!base) {
        if (!opts?.silent) {
          window.alert("Fiş ayarları yüklenemedi. Kasa oturumunu kontrol edin.");
        }
        return false;
      }
      const options = optionsForKasaOrder(base, order);
      const data = adminOrderToReceiptData(order, businessName, subdomain, paymentAtClose);
      const ok = printThermalReceipt(data, options);
      if (!ok && !opts?.silent) {
        window.alert("Fiş yazdırılamadı. Açılır pencere engelini kontrol edin.");
      }
      return ok;
    },
    [businessName, subdomain, loadOptions],
  );

  const printOrderIfAuto = useCallback(
    async (order: AdminOrder, paymentAtClose?: PaymentClose) => {
      const base = await loadOptions();
      // Kasa kapanışında: panelde autoPrintOnPayment kapalı olsa bile kasiyer yazdırabilsin diye
      // manuel buton ayrı; otomatik yalnızca ayar açıksa.
      if (!base?.settings.autoPrintOnPayment) return false;
      return printOrder(order, paymentAtClose, { silent: true });
    },
    [loadOptions, printOrder],
  );

  const printSession = useCallback(
    async (
      orders: AdminOrder[],
      tableNumber: number,
      sessionTotal: number,
      paymentAtClose: PaymentClose,
      opts?: { silent?: boolean },
    ) => {
      const base = await loadOptions();
      if (!base) {
        if (!opts?.silent) {
          window.alert("Fiş ayarları yüklenemedi. Kasa oturumunu kontrol edin.");
        }
        return false;
      }
      const options: ReceiptPrintOptions = {
        ...base,
        settings: receiptSettingsForKasaChannel(base.settings, "dine_in"),
      };
      const data = sessionOrdersToReceiptData(
        orders,
        tableNumber,
        businessName,
        subdomain,
        sessionTotal,
        paymentAtClose,
      );
      const ok = printThermalReceipt(data, options);
      if (!ok && !opts?.silent) {
        window.alert("Fiş yazdırılamadı. Açılır pencere engelini kontrol edin.");
      }
      return ok;
    },
    [businessName, subdomain, loadOptions],
  );

  const printSessionIfAuto = useCallback(
    async (
      orders: AdminOrder[],
      tableNumber: number,
      sessionTotal: number,
      paymentAtClose: PaymentClose,
    ) => {
      const base = await loadOptions();
      if (!base?.settings.autoPrintOnPayment) return false;
      return printSession(orders, tableNumber, sessionTotal, paymentAtClose, { silent: true });
    },
    [loadOptions, printSession],
  );

  return { printOrder, printOrderIfAuto, printSession, printSessionIfAuto };
}

export function useDashboardReceiptPrint(businessName: string, subdomain: string) {
  const optionsRef = useRef<ReceiptPrintOptions | null>(null);
  const printedOrderIdsRef = useRef<Set<string>>(new Set());

  const loadOptions = useCallback(async (force = false) => {
    if (!optionsRef.current || force) {
      optionsRef.current = await fetchDashboardReceiptPrintOptions();
    }
    return optionsRef.current;
  }, []);

  const printOrder = useCallback(
    async (order: AdminOrder) => {
      const options = await loadOptions();
      if (!options) {
        window.alert("Fiş ayarları yüklenemedi.");
        return false;
      }
      if (!options.settings.enabled) {
        window.alert("Fiş yazdırma kapalı. Dashboard → Operasyonlar → Fiş ayarlarından açın.");
        return false;
      }
      const data = adminOrderToReceiptData(order, businessName, subdomain);
      return printThermalReceipt(data, options);
    },
    [businessName, subdomain, loadOptions],
  );

  const printOrderIfAutoOnCreate = useCallback(
    async (orderId: string) => {
      if (printedOrderIdsRef.current.has(orderId)) return false;
      const options = await loadOptions(true);
      if (!options?.settings.enabled || !options.settings.autoPrintOnNewOrder) return false;

      const order = await fetchDashboardOrderById(orderId);
      if (!order) return false;

      printedOrderIdsRef.current.add(orderId);
      const data = adminOrderToReceiptData(order, businessName, subdomain);
      return printThermalReceipt(data, options);
    },
    [businessName, subdomain, loadOptions],
  );

  return { printOrder, printOrderIfAutoOnCreate };
}
