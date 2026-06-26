import { NextResponse } from "next/server";
import {
  updateTenantBusinessSettings,
  type TenantSettingsPatch,
} from "@/lib/dashboard/tenant-settings";
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

export async function POST(request: Request) {
  let patch: TenantSettingsPatch;
  try {
    patch = (await request.json()) as TenantSettingsPatch;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const result = await updateTenantBusinessSettings(patch);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı. Tekrar giriş yapın." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
