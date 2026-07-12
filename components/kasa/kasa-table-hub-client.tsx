"use client";

import { useState } from "react";
import KasaOrderModal from "@/components/kasa/kasa-order-modal";
import SessionPaymentClient from "@/components/kasa/session-payment-client";
import type { KasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { LocalMenuState } from "@/lib/local-menu";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

type KasaTableHubClientProps = {
  tableNumber: number;
  businessName: string;
  subdomain: string;
  initialSession: KasaSessionDetail;
  paymentFlags: TenantPaymentFlags;
  menu: LocalMenuState;
};

/** Dolu masa: ödeme ekranı + ürün ekleme modalı. */
export default function KasaTableHubClient({
  tableNumber,
  businessName,
  subdomain,
  initialSession,
  paymentFlags,
  menu,
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
        />
      ) : null}
    </>
  );
}
