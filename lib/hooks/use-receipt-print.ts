"use client";

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

export function useKasaReceiptPrint(businessName: string) {
  const optionsRef = useRef<ReceiptPrintOptions | null>(null);

  const loadOptions = useCallback(async () => {
    if (!optionsRef.current) {
      optionsRef.current = await fetchKasaReceiptPrintOptions();
    }
    return optionsRef.current;
  }, []);

  const printOrder = useCallback(
    async (order: AdminOrder, paymentAtClose?: PaymentClose) => {
      const options = await loadOptions();
      if (!options) return false;
      const data = adminOrderToReceiptData(order, businessName, paymentAtClose);
      return printThermalReceipt(data, options);
    },
    [businessName, loadOptions],
  );

  const printOrderIfAuto = useCallback(
    async (order: AdminOrder, paymentAtClose?: PaymentClose) => {
      const options = await loadOptions();
      if (!options?.settings.enabled || !options.settings.autoPrintOnPayment) return false;
      return printOrder(order, paymentAtClose);
    },
    [loadOptions, printOrder],
  );

  const printSession = useCallback(
    async (
      orders: AdminOrder[],
      tableNumber: number,
      sessionTotal: number,
      paymentAtClose: PaymentClose,
    ) => {
      const options = await loadOptions();
      if (!options) return false;
      const data = sessionOrdersToReceiptData(
        orders,
        tableNumber,
        businessName,
        sessionTotal,
        paymentAtClose,
      );
      return printThermalReceipt(data, options);
    },
    [businessName, loadOptions],
  );

  const printSessionIfAuto = useCallback(
    async (
      orders: AdminOrder[],
      tableNumber: number,
      sessionTotal: number,
      paymentAtClose: PaymentClose,
    ) => {
      const options = await loadOptions();
      if (!options?.settings.enabled || !options.settings.autoPrintOnPayment) return false;
      return printSession(orders, tableNumber, sessionTotal, paymentAtClose);
    },
    [loadOptions, printSession],
  );

  return { printOrder, printOrderIfAuto, printSession, printSessionIfAuto };
}

export function useDashboardReceiptPrint(businessName: string) {
  const optionsRef = useRef<ReceiptPrintOptions | null>(null);

  const loadOptions = useCallback(async () => {
    if (!optionsRef.current) {
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
      const data = adminOrderToReceiptData(order, businessName);
      return printThermalReceipt(data, options);
    },
    [businessName, loadOptions],
  );

  return { printOrder };
}
