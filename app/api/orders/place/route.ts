import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { PublicOrderCreatePayload } from "@/lib/orders";
import { emptyCustomerAddress } from "@/lib/customer-address";
import { isBusinessOpenNow } from "@/lib/business-hours";
import { isWithinDeliveryRadius, asGeoPoint } from "@/lib/geo";
import type { FulfillmentType } from "@/lib/fulfillment";
import { clampDeliveryRadiusKm } from "@/lib/fulfillment";
import {
  buildOrderLineCatalog,
  buildOrderLines,
  extractOrderLineProductIds,
  ORDER_LINE_PRODUCT_COLUMNS,
} from "@/lib/order-lines-build";
import { ensureTableSession } from "@/lib/table-sessions";
import type { MenuProductRow } from "@/lib/supabase/menu-types";
import {
  FREE_PLAN_UPGRADE_MESSAGE,
  hasFullTenantAccess,
} from "@/lib/tenant-entitlements";
import {
  isMealCardBrandAllowed,
  isMealCardBrandId,
  tenantPaymentFlagsFromRow,
} from "@/lib/tenant-payment";
import { tryCreateServerSupabaseClient } from "@/lib/supabase/server";
import { ensureCustomerAccount } from "@/lib/account-kind";
import { CUSTOMER_BLOCKED_LOGIN_MESSAGE, getCustomerBlockState } from "@/lib/superadmin/customers-service";

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
  const rawOrderSource = typeof payload.orderSource === "string" ? payload.orderSource : "qr_menu";
  const isTableOrder = rawOrderSource === "table_qr" || payload.fulfillmentType === "dine_in";
  const orderSource = isTableOrder
    ? "table_qr"
    : rawOrderSource === "marketplace"
      ? "marketplace"
      : "qr_menu";
  const fulfillmentType: FulfillmentType = isTableOrder
    ? "dine_in"
    : payload.fulfillmentType === "pickup" || payload.fulfillmentType === "delivery"
      ? payload.fulfillmentType
      : "delivery";
  const tableNumberRaw =
    typeof payload.tableNumber === "number" && Number.isFinite(payload.tableNumber)
      ? Math.round(payload.tableNumber)
      : null;
  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const orderNote = typeof payload.orderNote === "string" ? payload.orderNote.trim() : "";
  const courierNote = typeof payload.courierNote === "string" ? payload.courierNote.trim() : "";
  const paymentMethod =
    payload.paymentMethod === "cash" || payload.paymentMethod === "door_card" || payload.paymentMethod === "meal_card"
      ? payload.paymentMethod
      : isTableOrder
        ? "cash"
        : null;
  const mealCardBrandId = isMealCardBrandId(payload.mealCardBrandId) ? payload.mealCardBrandId : undefined;

  const customerLatitude =
    typeof payload.customerLatitude === "number" && Number.isFinite(payload.customerLatitude)
      ? payload.customerLatitude
      : null;
  const customerLongitude =
    typeof payload.customerLongitude === "number" && Number.isFinite(payload.customerLongitude)
      ? payload.customerLongitude
      : null;

  if (!subdomain || !firstName || !lastName || !phone) {
    return NextResponse.json({ error: "Sipariş bilgileri eksik." }, { status: 400 });
  }
  if (!isTableOrder && !paymentMethod) {
    return NextResponse.json({ error: "Ödeme yöntemi seçilmelidir." }, { status: 400 });
  }
  if (isTableOrder && (tableNumberRaw == null || tableNumberRaw < 1)) {
    return NextResponse.json({ error: "Geçersiz masa numarası." }, { status: 400 });
  }

  const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (rawLines.length === 0) {
    return NextResponse.json({ error: "Siparişte en az bir ürün olmalıdır." }, { status: 400 });
  }

  const address = sanitizeAddress(payload.address);

  try {
    const svc = createServiceSupabaseClient();
    const { data: tenant, error: tenantError } = await svc
      .from("tenants")
      .select(
        "id, subdomain, business_name, public_menu_enabled, open_time, close_time, fulfillment_pickup_enabled, fulfillment_delivery_enabled, latitude, longitude, delivery_radius_km, min_order_amount, dine_in_enabled, table_count, payment_cash, payment_door_card, payment_meal_card, payment_meal_card_brands, plan, trial_ends_at, order_eta_auto_enabled, order_eta_mode, order_eta_total_minutes, order_eta_prep_minutes, order_eta_ready_minutes, order_eta_dispatch_minutes, order_eta_deliver_minutes",
      )
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (tenantError || !tenant || tenant.public_menu_enabled !== true) {
      return NextResponse.json({ error: "Sipariş alınamıyor." }, { status: 404 });
    }

    if (!hasFullTenantAccess(tenant)) {
      return NextResponse.json({ error: FREE_PLAN_UPGRADE_MESSAGE }, { status: 403 });
    }

    const paymentFlags = tenantPaymentFlagsFromRow(tenant);
    if (!isTableOrder && paymentMethod) {
      if (paymentMethod === "cash" && !paymentFlags.paymentCash) {
        return NextResponse.json({ error: "Nakit ödeme bu işletmede aktif değil." }, { status: 400 });
      }
      if (paymentMethod === "door_card" && !paymentFlags.paymentDoorCard) {
        return NextResponse.json({ error: "Kredi kartı ödeme bu işletmede aktif değil." }, { status: 400 });
      }
      if (paymentMethod === "meal_card") {
        if (!paymentFlags.paymentMealCard || !isMealCardBrandAllowed(paymentFlags, mealCardBrandId)) {
          return NextResponse.json(
            { error: "Bu yemek kartı markası bu işletmede aktif değil." },
            { status: 400 },
          );
        }
      }
    }

    if (!isBusinessOpenNow(tenant.open_time, tenant.close_time)) {
      return NextResponse.json({ error: "Restoran şu anda kapalı. Sipariş alınamıyor." }, { status: 409 });
    }

    const pickupEnabled = tenant.fulfillment_pickup_enabled !== false;
    const deliveryEnabled = tenant.fulfillment_delivery_enabled === true;

    if (fulfillmentType === "dine_in") {
      if (tenant.dine_in_enabled !== true) {
        return NextResponse.json({ error: "Masa siparişi şu an kapalı." }, { status: 409 });
      }
      const tableCount = Number(tenant.table_count ?? 0);
      if (tableNumberRaw == null || tableNumberRaw < 1 || tableNumberRaw > tableCount) {
        return NextResponse.json({ error: "Geçersiz masa numarası." }, { status: 400 });
      }
    } else if (fulfillmentType === "pickup" && !pickupEnabled) {
      return NextResponse.json({ error: "Gel-al siparişi şu an kabul edilmiyor." }, { status: 409 });
    }
    if (fulfillmentType === "delivery" && !deliveryEnabled) {
      return NextResponse.json({ error: "Teslimat şu an kabul edilmiyor." }, { status: 409 });
    }

    let savedCustomerLat: number | null = null;
    let savedCustomerLng: number | null = null;

    if (fulfillmentType === "delivery") {
      if (!address.neighborhood || !address.street || !address.buildingNo) {
        return NextResponse.json({ error: "Teslimat adresi eksik." }, { status: 400 });
      }
      const restaurantPoint = asGeoPoint(tenant.latitude, tenant.longitude);
      const customerPoint = asGeoPoint(customerLatitude, customerLongitude);
      if (!restaurantPoint) {
        return NextResponse.json({ error: "Restoran konumu tanımlı değil." }, { status: 409 });
      }
      if (!customerPoint) {
        return NextResponse.json(
          { error: "Teslimat için «Konum al» ile adresinizi paylaşın." },
          { status: 400 },
        );
      }
      savedCustomerLat = customerPoint.lat;
      savedCustomerLng = customerPoint.lng;
      const radiusKm = clampDeliveryRadiusKm(Number(tenant.delivery_radius_km ?? 5));
      if (!isWithinDeliveryRadius(restaurantPoint, customerPoint, radiusKm)) {
        return NextResponse.json(
          { error: `Adresiniz teslimat alanı dışında (en fazla ${radiusKm} km).` },
          { status: 400 },
        );
      }
    }

    const productIds = extractOrderLineProductIds(rawLines);

    let catalogRows: MenuProductRow[] = [];
    if (productIds.length > 0) {
      const { data: productRows } = await svc
        .from("menu_products")
        .select(ORDER_LINE_PRODUCT_COLUMNS)
        .eq("tenant_id", tenant.id)
        .in("id", productIds);
      catalogRows = (productRows ?? []) as MenuProductRow[];
    }

    const catalogMap = buildOrderLineCatalog(catalogRows);
    const lines = buildOrderLines(rawLines, catalogMap, fulfillmentType);

    if (lines.length === 0) {
      return NextResponse.json({ error: "Siparişte en az bir ürün olmalıdır." }, { status: 400 });
    }

    const total = lines.reduce((sum, line) => sum + line.qty * line.unit_price, 0);

    if (fulfillmentType === "delivery" && tenant.min_order_amount != null) {
      const minAmount = Number(tenant.min_order_amount);
      if (Number.isFinite(minAmount) && minAmount > 0 && total < minAmount) {
        return NextResponse.json(
          { error: `Minimum sipariş tutarı ${Math.round(minAmount)} ₺.` },
          { status: 400 },
        );
      }
    }

    const code = orderCode();
    let tableSessionId: string | null = null;

    if (fulfillmentType === "dine_in" && tableNumberRaw != null) {
      tableSessionId = await ensureTableSession(svc, tenant.id, tableNumberRaw, "table_qr");
    }

    let customerUserId: string | null = null;
    try {
      const authClient = await tryCreateServerSupabaseClient();
      if (authClient) {
        const {
          data: { user },
        } = await authClient.auth.getUser();
        if (user && (await ensureCustomerAccount(user)) === "customer") {
          const block = await getCustomerBlockState(user.id);
          if (block.blocked) {
            return NextResponse.json({ error: CUSTOMER_BLOCKED_LOGIN_MESSAGE }, { status: 403 });
          }
          customerUserId = user.id;
        }
      }
    } catch {
      customerUserId = null;
    }

    const orderPayload = {
      tenant_id: tenant.id,
      order_code: code,
      order_source: orderSource,
      fulfillment_type: fulfillmentType,
      table_number: fulfillmentType === "dine_in" ? tableNumberRaw : null,
      table_session_id: tableSessionId,
      total,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_phone: phone,
      customer_email: email,
      address_json: fulfillmentType === "delivery" ? address : emptyCustomerAddress(),
      customer_latitude: fulfillmentType === "delivery" ? savedCustomerLat : null,
      customer_longitude: fulfillmentType === "delivery" ? savedCustomerLng : null,
      payment_method: paymentMethod ?? "cash",
      meal_card_brand_id: paymentMethod === "meal_card" ? mealCardBrandId ?? null : null,
      order_note: orderNote,
      courier_note: fulfillmentType === "delivery" ? courierNote : "",
      delivery_status: fulfillmentType === "delivery" ? "pending" : null,
    };

    let insertedOrder: { id: string; order_code: string } | null = null;
    let orderError: { message: string } | null = null;

    const firstInsert = await svc
      .from("orders")
      .insert({ ...orderPayload, customer_user_id: customerUserId })
      .select("id, order_code")
      .single();
    insertedOrder = firstInsert.data as { id: string; order_code: string } | null;
    orderError = firstInsert.error;

    if (
      (orderError || !insertedOrder) &&
      customerUserId &&
      /customer_user_id/i.test(orderError?.message ?? "")
    ) {
      const retry = await svc.from("orders").insert(orderPayload).select("id, order_code").single();
      insertedOrder = retry.data as { id: string; order_code: string } | null;
      orderError = retry.error;
    }

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

    await writeActivityLog({
      tenant_id: tenant.id,
      actor_type: "customer",
      actor_label: `${firstName} ${lastName}`.trim(),
      action: "order_created",
      entity_type: "order",
      entity_id: insertedOrder.id,
      order_code: insertedOrder.order_code as string,
      metadata: {
        source: orderSource,
        fulfillment_type: fulfillmentType,
        table: tableNumberRaw,
        item_count: lines.length,
      },
    });

    if (customerUserId) {
      try {
        const { scheduleAutoNotificationsForOrder } = await import("@/lib/musteri/notifications-service");
        await scheduleAutoNotificationsForOrder({
          userId: customerUserId,
          orderId: insertedOrder.id,
          orderCode: insertedOrder.order_code as string,
          subdomain: String((tenant as { subdomain?: string }).subdomain ?? subdomain),
          restaurantName: String((tenant as { business_name?: string }).business_name ?? "Restoran"),
          fulfillmentIsDelivery: fulfillmentType === "delivery",
          tenantRow: tenant as unknown as Record<string, unknown>,
        });
      } catch {
        /* bildirim opsiyonel — ETA kolonları yoksa yine de received dene */
        try {
          const { insertCustomerNotification } = await import("@/lib/musteri/notifications-service");
          await insertCustomerNotification({
            userId: customerUserId,
            orderId: insertedOrder.id,
            orderCode: insertedOrder.order_code as string,
            subdomain,
            restaurantName: String((tenant as { business_name?: string }).business_name ?? "Restoran"),
            stage: "received",
            source: "system",
            deliverNow: true,
          });
        } catch {
          /* ignore */
        }
      }
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
