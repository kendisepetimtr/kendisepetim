import { NextResponse } from "next/server";
import {
  deleteCourier,
  deleteWaiter,
  loadOperationsSettings,
  updateNotificationSettings,
  updateOperationsSettings,
  updateReceiptSettings,
  updateStaffPin,
  upsertCourier,
  upsertWaiter,
  type CourierInput,
  type OperationsPatch,
  type StaffPinPatch,
  type WaiterInput,
} from "@/lib/dashboard/operations-settings";
import type { TenantNotificationSettings } from "@/lib/notification-settings";
import type { TenantReceiptSettings } from "@/lib/receipt-settings";

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
  | { action: "courier-delete"; courierId: string }
  | { action: "waiter-upsert"; waiter: WaiterInput }
  | { action: "waiter-delete"; waiterId: string }
  | { action: "notification-settings"; patch: TenantNotificationSettings }
  | { action: "receipt-settings"; patch: TenantReceiptSettings };

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

  if (body.action === "waiter-upsert") {
    const result = await upsertWaiter(body.waiter);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "waiter-delete") {
    const result = await deleteWaiter(body.waiterId);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "notification-settings") {
    const result = await updateNotificationSettings(body.patch);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (body.action === "receipt-settings") {
    const result = await updateReceiptSettings(body.patch);
    if (!result.ok) {
      const status = result.error === "Oturum bulunamadı." ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: "Bilinmeyen işlem." }, { status: 400 });
}
