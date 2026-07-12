import { notFound, redirect } from "next/navigation";
import SessionPaymentClient from "@/components/kasa/session-payment-client";
import { getAuthenticatedCashierTenant } from "@/lib/kasa/cashier-tenant";
import { loadKasaSessionDetail } from "@/lib/kasa/sessions-service";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string; tableNumber: string }> };

function parseTableNumber(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 200) return null;
  return n;
}

/** Masa hesabı / ödeme — sipariş alma kasa grid modalında. */
export default async function KasaTableSessionPage({ params }: Props) {
  const { slug, tableNumber: rawTable } = await params;
  const tableNumber = parseTableNumber(rawTable);
  if (tableNumber == null) notFound();

  const auth = await getAuthenticatedCashierTenant(slug);
  if (!auth.ok) notFound();

  if (tableNumber > (auth.tenant.table_count ?? 0)) notFound();

  const detail = await loadKasaSessionDetail(auth.tenant.id, tableNumber);
  if (!detail.ok) {
    redirect("/kasa");
  }

  const paymentFlags: TenantPaymentFlags = {
    paymentCash: auth.tenant.payment_cash === true,
    paymentDoorCard: auth.tenant.payment_door_card === true,
    paymentMealCard: auth.tenant.payment_meal_card === true,
  };

  return (
    <SessionPaymentClient
      tableNumber={tableNumber}
      businessName={auth.tenant.business_name}
      initialSession={detail.session}
      paymentFlags={paymentFlags}
    />
  );
}
