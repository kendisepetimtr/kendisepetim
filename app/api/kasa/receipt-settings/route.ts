import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { parseReceiptSettings } from "@/lib/receipt-settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const row = auth.tenant as unknown as Record<string, unknown>;
  const settings = parseReceiptSettings(row.receipt_settings);
  const logoUrl =
    typeof auth.tenant.logo_url === "string" && auth.tenant.logo_url.trim()
      ? auth.tenant.logo_url.trim()
      : null;

  return NextResponse.json({ ok: true, settings, logoUrl });
}
