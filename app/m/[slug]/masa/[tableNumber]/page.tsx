import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicMenuClient from "@/components/public-menu/public-menu-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { buildLocalMenuState } from "@/lib/menu-map";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";
import type { TenantRow } from "@/lib/supabase/tenant-types";
import { getTableMenuUrl } from "@/lib/public-menu-urls";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw, tableNumber: rawTable } = await params;
  const slug = raw.toLowerCase();
  const tableNumber = parseTableNumber(rawTable);
  if (!isValidMenuSlug(slug) || tableNumber == null) return { title: "Masa Menüsü" };

  const svc = getServiceClientSafe();
  const titleBase = slug.charAt(0).toUpperCase() + slug.slice(1);
  if (!svc) {
    return { title: `Masa ${tableNumber} — ${titleBase}` };
  }

  const { data: tenant } = await svc
    .from("tenants")
    .select("business_name, public_menu_enabled, seo_index_enabled")
    .eq("subdomain", slug)
    .maybeSingle();

  const businessName = tenant?.business_name?.trim() || titleBase;
  const indexEnabled = tenant?.public_menu_enabled === true && tenant?.seo_index_enabled === true;

  return {
    title: `Masa ${tableNumber} — ${businessName}`,
    description: `${businessName} masa ${tableNumber} dijital menüsü`,
    robots: { index: false, follow: false },
    alternates: {
      canonical: getTableMenuUrl(slug, tableNumber),
    },
    openGraph: {
      title: `Masa ${tableNumber} — ${businessName}`,
      url: getTableMenuUrl(slug, tableNumber),
      type: "website",
    },
    ...(indexEnabled ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function TableMenuPage({ params }: Props) {
  const { slug: raw, tableNumber: rawTable } = await params;
  const slug = raw.toLowerCase();
  const tableNumber = parseTableNumber(rawTable);
  if (!isValidMenuSlug(slug) || tableNumber == null) notFound();

  const svc = getServiceClientSafe();
  if (!svc) notFound();

  const { data: tenant, error: tenantError } = await svc
    .from("tenants")
    .select("*")
    .eq("subdomain", slug)
    .maybeSingle();

  if (tenantError || !tenant || tenant.public_menu_enabled !== true) notFound();

  const row = tenant as TenantRow;
  if (row.dine_in_enabled !== true) notFound();
  if (tableNumber > (row.table_count ?? 0)) notFound();

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

  const paymentFlags = tenantPaymentFlagsFromRow(row);
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
      initialMenu={buildLocalMenuState({
        categories,
        products: (productRows ?? []) as MenuProductRow[],
      })}
    />
  );
}
