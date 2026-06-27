import { NextResponse } from "next/server";
import { loadDashboardMenuState } from "@/lib/dashboard/menu-load";
import { runDashboardMenuMutation, type MenuMutationBody } from "@/lib/dashboard/menu-mutations";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadDashboardMenuState();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 503;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

/** Menü mutasyonları — server action yerine JSON; POST /dashboard RSC yenilemesi tetiklenmez. */
export async function POST(request: Request) {
  let body: MenuMutationBody;
  try {
    body = (await request.json()) as MenuMutationBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const result = await runDashboardMenuMutation(body);
  if (!result.ok) {
    const status =
      result.error === "Oturum bulunamadı." || result.error === "Oturum bulunamadı. Tekrar giriş yapın."
        ? 401
        : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
