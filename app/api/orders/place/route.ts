import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { PublicOrderCreatePayload } from "@/lib/orders";
import { emptyCustomerAddress } from "@/lib/customer-address";
import { isBusinessOpenNow } from "@/lib/business-hours";
import { isWithinDeliveryRadius, asGeoPoint } from "@/lib/geo";
import type { FulfillmentType } from "@/lib/fulfillment";
import { clampDeliveryRadiusKm } from "@/lib/fulfillment";
import { getProductPriceForFulfillment } from "@/lib/product-pricing";
import type { MenuProductRow } from "@/lib/supabase/menu-types";

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

function menuRowToPricingProduct(row: MenuProductRow) {
  return {
    price: Number(row.price),
    usePackagePrice: row.use_package_price,
    packagePrice: Number(row.package_price),
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
  const orderSource =
    payload.orderSource === "marketplace" || payload.orderSource === "qr_menu" ? payload.orderSource : "qr_menu";
  const fulfillmentType: FulfillmentType =
    payload.fulfillmentType === "pickup" || payload.fulfillmentType === "delivery"
      ? payload.fulfillmentType
      : "delivery";
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

  const customerLatitude =
    typeof payload.customerLatitude === "number" && Number.isFinite(payload.customerLatitude)
      ? payload.customerLatitude
      : null;
  const customerLongitude =
    typeof payload.customerLongitude === "number" && Number.isFinite(payload.customerLongitude)
      ? payload.customerLongitude
      : null;

  if (!subdomain || !firstName || !lastName || !phone || !paymentMethod) {
    return NextResponse.json({ error: "Sipariş bilgileri eksik." }, { status: 400 });
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
        "id, public_menu_enabled, open_time, close_time, fulfillment_pickup_enabled, fulfillment_delivery_enabled, latitude, longitude, delivery_radius_km, min_order_amount",
      )
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (tenantError || !tenant || tenant.public_menu_enabled !== true) {
      return NextResponse.json({ error: "Sipariş alınamıyor." }, { status: 404 });
    }

    if (!isBusinessOpenNow(tenant.open_time, tenant.close_time)) {
      return NextResponse.json({ error: "Restoran şu anda kapalı. Sipariş alınamıyor." }, { status: 409 });
    }

    const pickupEnabled = tenant.fulfillment_pickup_enabled !== false;
    const deliveryEnabled = tenant.fulfillment_delivery_enabled === true;

    if (fulfillmentType === "pickup" && !pickupEnabled) {
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

    const productIds = rawLines
      .map((line) => (typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null))
      .filter((id): id is string => id != null);

    const productPriceMap = new Map<string, ReturnType<typeof menuRowToPricingProduct>>();
    if (productIds.length > 0) {
      const { data: productRows } = await svc
        .from("menu_products")
        .select("id, price, package_price, use_package_price")
        .eq("tenant_id", tenant.id)
        .in("id", productIds);
      for (const row of (productRows ?? []) as MenuProductRow[]) {
        productPriceMap.set(row.id, menuRowToPricingProduct(row));
      }
    }

    const lines = rawLines
      .map((line, index) => {
        const name = typeof line.name === "string" ? line.name.trim() : "";
        const qty =
          typeof line.qty === "number" && Number.isFinite(line.qty) && line.qty > 0 ? Math.round(line.qty) : 0;
        if (!name || qty <= 0) return null;

        const productId = typeof line.productId === "string" && isUuid(line.productId) ? line.productId : null;
        const catalog = productId ? productPriceMap.get(productId) : null;
        const unitPrice = catalog
          ? getProductPriceForFulfillment(
              {
                id: productId ?? "",
                categoryId: "",
                name,
                description: "",
                ingredients: "",
                price: catalog.price,
                usePackagePrice: catalog.usePackagePrice,
                packagePrice: catalog.packagePrice,
                hidden: false,
                signatureDish: false,
                checkoutUpsell: false,
                imageDataUrl: "",
                warningPresetKeys: [],
                customWarnings: [],
                warningBadges: [],
              },
              fulfillmentType,
            )
          : typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0
            ? Math.round(line.unitPrice * 100) / 100
            : 0;

        return {
          product_id: productId,
          name,
          qty,
          unit_price: unitPrice,
          removed_ingredients: Array.isArray(line.removedIngredients)
            ? line.removedIngredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [],
          sort_order: index,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line != null);

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
    const { data: insertedOrder, error: orderError } = await svc
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        order_code: code,
        order_source: orderSource,
        fulfillment_type: fulfillmentType,
        total,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: phone,
        customer_email: email,
        address_json: fulfillmentType === "pickup" ? emptyCustomerAddress() : address,
        customer_latitude: fulfillmentType === "delivery" ? savedCustomerLat : null,
        customer_longitude: fulfillmentType === "delivery" ? savedCustomerLng : null,
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
