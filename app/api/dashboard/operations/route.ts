import { NextResponse } from "next/server";
import {
  deleteCourier,
  loadOperationsSettings,
  updateOperationsSettings,
  updateStaffPin,
  upsertCourier,
  type CourierInput,
  type OperationsPatch,
  type StaffPinPatch,
} from "@/lib/dashboard/operations-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadOperationsSettings();
  if (!result.ok) {
    const status = result.error === "Oturum bulunamadı." ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

type OperationsPostBody =
  | { action: "settings"; patch: OperationsPatch }
  | { action: "pin"; patch: StaffPinPatch }
  | { action: "courier-upsert"; courier: CourierInput }
  | { action: "courier-delete"; courierId: string };

export async function POST(request: Request) {
  let body: OperationsPostBody;
  try {
    body = (await request.json()) as OperationsPostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (body.action === "settings") {
    const result = await updateOperationsSettings(body.patch);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "pin") {
    const result = await updateStaffPin(body.patch);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "courier-upsert") {
    const result = await upsertCourier(body.courier);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "courier-delete") {
    const result = await deleteCourier(body.courierId);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: "Bilinmeyen işlem." }, { status: 400 });
}
