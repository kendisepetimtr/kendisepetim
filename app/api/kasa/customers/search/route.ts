import { NextResponse } from "next/server";
import { getAuthenticatedCashierTenantByCookie } from "@/lib/kasa/cashier-tenant";
import { searchCashierCustomers } from "@/lib/kasa/customer-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthenticatedCashierTenantByCookie();
  if (!auth.ok) {
    const status = auth.error === "Kasa oturumu gerekli." ? 401 : 400;
    return NextResponse.json(auth, { status });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const result = await searchCashierCustomers(auth.tenant.id, q);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
