import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicMenuClient from "@/components/public-menu/public-menu-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { loadMusteriSession } from "@/lib/musteri/session";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { buildLocalMenuState } from "@/lib/menu-map";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import { tenantPaymentFlagsFromRow } from "@/lib/tenant-payment";
import type { TenantRow } from "@/lib/supabase/tenant-types";

type Props = { params: Promise<{ slug: string }> };

function getServiceClientSafe() {
  try {
    return createServiceSupabaseClient();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (!isValidMenuSlug(slug)) return { title: "Menü" };

  const svc = getServiceClientSafe();
  if (!svc) {
    const title = slug.charAt(0).toUpperCase() + slug.slice(1);
    return { title: `${title} - Menu` };
  }

  const { data: tenant } = await svc
    .from("tenants")
    .select("business_name, public_description, public_menu_enabled, seo_index_enabled, logo_url")
    .eq("subdomain", slug)
    .maybeSingle();

  const title = tenant?.business_name?.trim() || slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = tenant?.public_description?.trim() || `${title} dijital menu`;
  const indexEnabled = tenant?.public_menu_enabled === true && tenant?.seo_index_enabled === true;
  const isPublicMenuEnabled = tenant?.public_menu_enabled === true;
  const encodedSlug = encodeURIComponent(slug);
  const tenantFaviconUrl = isPublicMenuEnabled ? `/m/${encodedSlug}/favicon` : "/ks-logo.png";
  const tenantAppIconUrl = isPublicMenuEnabled ? `/m/${encodedSlug}/icon?size=192` : "/ks-logo.png";
  const manifestUrl = isPublicMenuEnabled ? `/m/${encodedSlug}/manifest.webmanifest` : undefined;
  return {
    title: `${title} - Menu`,
    description,
    robots: { index: indexEnabled, follow: indexEnabled },
    applicationName: title,
    manifest: manifestUrl,
    icons: {
      icon: [{ url: tenantAppIconUrl, type: "image/png" }],
      apple: [{ url: tenantAppIconUrl, type: "image/png" }],
      shortcut: [{ url: tenantFaviconUrl }],
    },
    alternates: {
      canonical: `https://${slug}.kendisepetim.com`,
    },
    openGraph: {
      title: `${title} - Menu`,
      description,
      url: `https://${slug}.kendisepetim.com`,
      type: "website",
    },
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (!isValidMenuSlug(slug)) notFound();

  const svc = getServiceClientSafe();
  if (!svc) notFound();

  const { data: tenant, error: tenantError } = await svc
    .from("tenants")
    .select("*")
    .eq("subdomain", slug)
    .maybeSingle();

  if (tenantError || !tenant || tenant.public_menu_enabled !== true) notFound();

  const row = tenant as TenantRow;

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
    fulfillmentPickupEnabled: row.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: row.fulfillment_delivery_enabled === true,
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
  const musteriSession = await loadMusteriSession();

  return (
    <PublicMenuClient
      slug={slug}
      businessName={row.business_name}
      businessLogoUrl={row.logo_url ?? ""}
      businessCoverImageUrl={row.cover_image_url ?? ""}
      publicDescription={row.public_description ?? ""}
      googleMapsUrl={row.google_maps_url ?? ""}
      googleReviewsUrl={row.google_reviews_url ?? ""}
      hoursPair={{ open: row.open_time, close: row.close_time }}
      initialOpenStatus={initialOpenStatus}
      initialClosedMessage={initialClosedMessage}
      paymentFlags={paymentFlags}
      fulfillmentFlags={fulfillmentFlags}
      initialMenu={buildLocalMenuState({
        categories,
        products: (productRows ?? []) as MenuProductRow[],
      })}
      initialCustomerSession={{
        kind: musteriSession.kind,
        firstName: musteriSession.firstName,
        lastName: musteriSession.lastName,
        email: musteriSession.email,
      }}
    />
  );
}
