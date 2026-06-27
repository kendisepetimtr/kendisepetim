import Link from "next/link";
import { notFound } from "next/navigation";
import PublicMenuClient from "@/components/public-menu/public-menu-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { buildLocalMenuState } from "@/lib/menu-map";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";
import { getAuthenticatedWaiterTenant } from "@/lib/garson/waiter-tenant";

type Props = { params: Promise<{ slug: string; tableNumber: string }> };

function getServiceClientSafe() {
  try {
    return createServiceSupabaseClient();
  } catch {
    return null;
  }
}

function parseTableNumber(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 200) return null;
  return n;
}

export default async function GarsonTableOrderPage({ params }: Props) {
  const { slug: raw, tableNumber: rawTable } = await params;
  const slug = raw.toLowerCase();
  const tableNumber = parseTableNumber(rawTable);
  if (!isValidMenuSlug(slug) || tableNumber == null) notFound();

  const auth = await getAuthenticatedWaiterTenant(slug);
  if (!auth.ok) notFound();

  if (tableNumber > (auth.tenant.table_count ?? 0)) notFound();

  const svc = getServiceClientSafe();
  if (!svc) notFound();

  const row = auth.tenant as TenantRow;

  const { data: categoryRows } = await svc
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", row.id)
    .eq("hidden", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (categoryRows ?? []) as MenuCategoryRow[];
  const categoryIds = categories.map((c) => c.id);

  const { data: productRows } =
    categoryIds.length > 0
      ? await svc
          .from("menu_products")
          .select("*")
          .eq("tenant_id", row.id)
          .eq("hidden", false)
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
      : { data: [] as MenuProductRow[] };

  const paymentFlags: TenantPaymentFlags = {
    paymentCash: row.payment_cash === true,
    paymentDoorCard: row.payment_door_card === true,
    paymentMealCard: row.payment_meal_card === true,
  };
  const fulfillmentFlags: TenantFulfillmentFlags = {
    fulfillmentPickupEnabled: false,
    fulfillmentDeliveryEnabled: false,
    deliveryRadiusKm: clampDeliveryRadiusKm(Number(row.delivery_radius_km ?? 5)),
    minOrderAmount:
      row.min_order_amount != null && Number.isFinite(Number(row.min_order_amount))
        ? Number(row.min_order_amount)
        : null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };
  const initialOpenStatus = isBusinessOpenNow(row.open_time, row.close_time);
  const initialClosedMessage = getBusinessClosedMessage(row.open_time, row.close_time);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-surface-container-highest bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/garson"
            className="inline-flex items-center gap-1 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Masalar
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Garson · Masa {tableNumber}</p>
            <p className="truncate text-sm font-semibold text-on-background">{row.business_name}</p>
          </div>
        </div>
      </div>
      <PublicMenuClient
        slug={slug}
        businessName={row.business_name}
        businessLogoUrl={row.logo_url ?? ""}
        businessCoverImageUrl={row.cover_image_url ?? ""}
        publicDescription={row.public_description ?? ""}
        googleMapsUrl={row.google_maps_url ?? ""}
        hoursPair={{ open: row.open_time, close: row.close_time }}
        initialOpenStatus={initialOpenStatus}
        initialClosedMessage={initialClosedMessage}
        paymentFlags={paymentFlags}
        fulfillmentFlags={fulfillmentFlags}
        tableNumber={tableNumber}
        waiterMode
        initialMenu={buildLocalMenuState({
          categories,
          products: (productRows ?? []) as MenuProductRow[],
        })}
      />
    </div>
  );
}
