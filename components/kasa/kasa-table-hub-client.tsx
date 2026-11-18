"use client";

import { useCallback, useEffect, useState } from "react";
import KasaOrderModal from "@/components/kasa/kasa-order-modal";
import SessionPaymentClient from "@/components/kasa/session-payment-client";
import type { KasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { LocalMenuState } from "@/lib/local-menu";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";
import { KASA_OPS_SURFACE, type OpsSurface } from "@/lib/ops/surface";

type KasaTableHubClientProps = {
  tableNumber: number;
  businessName: string;
  subdomain: string;
  initialSession: KasaSessionDetail;
  paymentFlags: TenantPaymentFlags;
  menu: LocalMenuState;
  surface?: OpsSurface;
  embedded?: boolean;
  onBack?: () => void;
};

/** Dolu masa: ödeme ekranı + ürün ekleme modalı. */
export default function KasaTableHubClient({
  tableNumber,
  businessName,
  subdomain,
  initialSession,
  paymentFlags,
  menu,
  surface = KASA_OPS_SURFACE,
  embedded = false,
  onBack,
}: KasaTableHubClientProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [session, setSession] = useState(initialSession);
  const [sessionKey, setSessionKey] = useState(0);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  const refreshSession = useCallback(async () => {
    setRefreshError(null);
    try {
      const res = await fetch(`${surface.apiBase}/sessions?tableNumber=${tableNumber}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        empty?: boolean;
        session?: KasaSessionDetail;
        error?: string;
      };
      if (data.empty) {
        onBack?.();
        return;
      }
      if (!res.ok || !data.ok || !data.session) {
        setRefreshError(data.error ?? "Masa oturumu yenilenemedi.");
        return;
      }
      setSession(data.session);
      setSessionKey((k) => k + 1);
    } catch {
      setRefreshError("Masa oturumu yenilenemedi. Bağlantıyı kontrol edin.");
    }
  }, [surface.apiBase, tableNumber, onBack]);

  return (
    <>
      {refreshError ? (
        <p className="mb-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{refreshError}</p>
      ) : null}
      <SessionPaymentClient
        key={sessionKey}
        tableNumber={tableNumber}
        businessName={businessName}
        subdomain={subdomain}
        initialSession={session}
        paymentFlags={paymentFlags}
        onAddItems={() => setAddOpen(true)}
        surface={surface}
        embedded={embedded}
        onBack={onBack}
      />
      {addOpen ? (
        <KasaOrderModal
          open
          channel="dine_in"
          tableNumber={tableNumber}
          title={`Masa ${tableNumber}`}
          businessName={businessName}
          subdomain={subdomain}
          menu={menu}
          onClose={() => setAddOpen(false)}
          onOrderPlaced={() => {
            setAddOpen(false);
            // Fiş önizlemesinin mount olması için reload yok; soft refresh gecikmeli.
            window.setTimeout(() => {
              void refreshSession();
            }, 100);
          }}
          ordersEndpoint={`${surface.apiBase}/orders`}
          customersSearchBase={surface.apiBase}
        />
      ) : null}
    </>
  );
}
