import { NextResponse } from "next/server";
import {
  updateMarketplaceSettings,
  type MarketplaceSettingsPatch,
} from "@/lib/dashboard/marketplace-settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let patch: MarketplaceSettingsPatch;
  try {
    patch = (await request.json()) as MarketplaceSettingsPatch;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const result = await updateMarketplaceSettings(patch);
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı. Tekrar giriş yapın." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
