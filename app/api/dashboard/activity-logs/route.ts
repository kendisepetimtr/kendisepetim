import { NextResponse } from "next/server";
import { loadActivityLogs } from "@/lib/dashboard/activity-logs-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadActivityLogs(200);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
