import { getAuthenticatedOwnerTenant } from "@/lib/dashboard/owner-tenant";
import { parseReceiptSettings } from "@/lib/receipt-settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getAuthenticatedOwnerTenant();
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  const row = tenant as unknown as Record<string, unknown>;
  const settings = parseReceiptSettings(row.receipt_settings);
  const logoUrl =
    typeof tenant.logo_url === "string" && tenant.logo_url.trim() ? tenant.logo_url.trim() : null;

  return NextResponse.json({ ok: true, settings, logoUrl });
}
