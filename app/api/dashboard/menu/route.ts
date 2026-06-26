import { NextResponse } from "next/server";
import { loadDashboardMenuState } from "@/lib/dashboard/menu-load";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadDashboardMenuState();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 503;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
