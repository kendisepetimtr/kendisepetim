"use client";

import { useState } from "react";
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
}: KasaTableHubClientProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <>
      <SessionPaymentClient
        key={sessionKey}
        tableNumber={tableNumber}
        businessName={businessName}
        subdomain={subdomain}
        initialSession={initialSession}
        paymentFlags={paymentFlags}
        onAddItems={() => setAddOpen(true)}
        surface={surface}
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
            setSessionKey((k) => k + 1);
            window.location.reload();
          }}
          ordersEndpoint={`${surface.apiBase}/orders`}
          customersSearchBase={surface.apiBase}
        />
      ) : null}
    </>
  );
}
