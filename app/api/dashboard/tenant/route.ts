import { NextResponse } from "next/server";
import { loadDashboardTenantProfile } from "@/lib/dashboard/tenant-sync";

export const dynamic = "force-dynamic";

/** Tenant profili — server action yerine JSON; POST /dashboard RSC yenilemesi tetiklenmez. */
export async function GET() {
  const result = await loadDashboardTenantProfile();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 503;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
