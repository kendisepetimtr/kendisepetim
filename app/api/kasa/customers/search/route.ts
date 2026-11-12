import { NextResponse } from "next/server";
import { searchCashierCustomers } from "@/lib/kasa/customer-search";
import { getAuthenticatedOpsTenantByCookie } from "@/lib/ops/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthenticatedOpsTenantByCookie();
  if (!auth.ok) {
    const status =
      auth.error === "Oturum gerekli." || auth.error === "Admin PIN oturumu gerekli." ? 401 : 400;
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
