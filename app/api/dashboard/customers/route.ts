import { NextResponse } from "next/server";
import { loadDashboardCustomers } from "@/lib/dashboard/customers-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadDashboardCustomers();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
