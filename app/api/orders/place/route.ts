import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { PublicOrderCreatePayload } from "@/lib/orders";
import { emptyCustomerAddress } from "@/lib/customer-address";
import { isBusinessOpenNow } from "@/lib/business-hours";

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function orderCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KS-${rand}`;
}

function sanitizeAddress(input: PublicOrderCreatePayload["address"]) {
  const base = emptyCustomerAddress();
  return {
    neighborhood: typeof input?.neighborhood === "string" ? input.neighborhood.trim() : base.neighborhood,
    street: typeof input?.street === "string" ? input.street.trim() : base.street,
    buildingNo: typeof input?.buildingNo === "string" ? input.buildingNo.trim() : base.buildingNo,
    buildingName: typeof input?.buildingName === "string" ? input.buildingName.trim() : base.buildingName,
    floor: typeof input?.floor === "string" ? input.floor.trim() : base.floor,
    apartmentNo: typeof input?.apartmentNo === "string" ? input.apartmentNo.trim() : base.apartmentNo,
    livesInSite: input?.livesInSite === true,
    siteName: typeof input?.siteName === "string" ? input.siteName.trim() : base.siteName,
    block: typeof input?.block === "string" ? input.block.trim() : base.block,
  };
}

export async function POST(request: Request) {
  let payload: PublicOrderCreatePayload;
  try {
    payload = (await request.json()) as PublicOrderCreatePayload;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const subdomain = typeof payload.subdomain === "string" ? payload.subdomain.trim().toLowerCase() : "";
  const orderSource = payload.orderSource === "qr_menu" ? "qr_menu" : "qr_menu";
  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const orderNote = typeof payload.orderNote === "string" ? payload.orderNote.trim() : "";
  const paymentMethod =
    payload.paymentMethod === "cash" || payload.paymentMethod === "door_card" || payload.paymentMethod === "meal_card"
      ? payload.paymentMethod
      : null;
  const mealCardBrandId =
    payload.mealCardBrandId === "multinet" ||
    payload.mealCardBrandId === "sodexo" ||
    payload.mealCardBrandId === "edenred"
      ? payload.mealCardBrandId
      : undefined;

  if (!subdomain || !firstName || !lastName || !phone || !paymentMethod) {
    return NextResponse.json({ error: "Sipariş bilgileri eksik." }, { status: 400 });
  }

  const lines = Array.isArray(payload.lines)
    ? payload.lines
        .map((line, index) => ({
          product_id: typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null,
          name: typeof line.name === "string" ? line.name.trim() : "",
          qty: typeof line.qty === "number" && Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 0,
          unit_price:
            typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0
              ? Math.round(line.unitPrice * 100) / 100
              : 0,
          removed_ingredients: Array.isArray(line.removedIngredients)
            ? line.removedIngredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [],
          sort_order: index,
        }))
        .filter((line) => line.name && line.qty > 0)
    : [];

  if (lines.length === 0) {
    return NextResponse.json({ error: "Siparişte en az bir ürün olmalıdır." }, { status: 400 });
  }

  const total = typeof payload.total === "number" && Number.isFinite(payload.total) && payload.total >= 0
    ? Math.round(payload.total * 100) / 100
    : lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0);

  const address = sanitizeAddress(payload.address);

  try {
    const svc = createServiceSupabaseClient();
    const { data: tenant, error: tenantError } = await svc
      .from("tenants")
      .select("id, public_menu_enabled, open_time, close_time")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (tenantError || !tenant || tenant.public_menu_enabled !== true) {
      return NextResponse.json({ error: "Sipariş alınamıyor." }, { status: 404 });
    }

    if (!isBusinessOpenNow(tenant.open_time, tenant.close_time)) {
      return NextResponse.json({ error: "Restoran şu anda kapalı. Sipariş alınamıyor." }, { status: 409 });
    }

    const code = orderCode();
    const { data: insertedOrder, error: orderError } = await svc
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        order_code: code,
        order_source: orderSource,
        total,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        customer_email: email,
        address_json: address,
        payment_method: paymentMethod,
        meal_card_brand_id: paymentMethod === "meal_card" ? mealCardBrandId ?? null : null,
        order_note: orderNote,
      })
      .select("id, order_code")
      .single();

    if (orderError || !insertedOrder) {
      return NextResponse.json({ error: orderError?.message ?? "Sipariş kaydedilemedi." }, { status: 500 });
    }

    const { error: lineError } = await svc.from("order_lines").insert(
      lines.map((line) => ({
        order_id: insertedOrder.id,
        tenant_id: tenant.id,
        ...line,
      })),
    );

    if (lineError) {
      await svc.from("orders").delete().eq("id", insertedOrder.id);
      return NextResponse.json({ error: "Sipariş kalemleri kaydedilemedi." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      orderId: insertedOrder.id,
      orderCode: insertedOrder.order_code,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sipariş kaydedilemedi." },
      { status: 500 },
    );
  }
}
