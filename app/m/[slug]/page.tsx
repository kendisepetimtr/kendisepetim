import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicMenuClient from "@/components/public-menu/public-menu-client";
import { getBusinessClosedMessage, isBusinessOpenNow } from "@/lib/business-hours";
import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { buildLocalMenuState } from "@/lib/menu-map";
import type { MenuCategoryRow, MenuProductRow } from "@/lib/supabase/menu-types";
import { clampDeliveryRadiusKm, type TenantFulfillmentFlags } from "@/lib/fulfillment";
import type { TenantPaymentFlags } from "@/lib/tenant-payment";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (!isValidMenuSlug(slug)) return { title: "Menü" };
  const svc = createServiceSupabaseClient();
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

  const svc = createServiceSupabaseClient();
  const { data: tenant } = await svc
    .from("tenants")
    .select("id, business_name, logo_url, cover_image_url, public_description, google_maps_url, open_time, close_time, payment_cash, payment_door_card, payment_meal_card, public_menu_enabled, fulfillment_pickup_enabled, fulfillment_delivery_enabled, delivery_radius_km, latitude, longitude, min_order_amount")
    .eq("subdomain", slug)
    .maybeSingle();

  if (!tenant || tenant.public_menu_enabled !== true) notFound();

  const { data: categoryRows } = await svc
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", tenant.id)
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
          .eq("tenant_id", tenant.id)
          .eq("hidden", false)
          .in("category_id", categoryIds)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
      : { data: [] as MenuProductRow[] };

  const paymentFlags: TenantPaymentFlags = {
    paymentCash: tenant.payment_cash === true,
    paymentDoorCard: tenant.payment_door_card === true,
    paymentMealCard: tenant.payment_meal_card === true,
  };
  const fulfillmentFlags: TenantFulfillmentFlags = {
    fulfillmentPickupEnabled: tenant.fulfillment_pickup_enabled !== false,
    fulfillmentDeliveryEnabled: tenant.fulfillment_delivery_enabled === true,
    deliveryRadiusKm: clampDeliveryRadiusKm(Number(tenant.delivery_radius_km ?? 5)),
    minOrderAmount:
      tenant.min_order_amount != null && Number.isFinite(Number(tenant.min_order_amount))
        ? Number(tenant.min_order_amount)
        : null,
    latitude: tenant.latitude != null ? Number(tenant.latitude) : null,
    longitude: tenant.longitude != null ? Number(tenant.longitude) : null,
  };
  const initialOpenStatus = isBusinessOpenNow(tenant.open_time, tenant.close_time);
  const initialClosedMessage = getBusinessClosedMessage(tenant.open_time, tenant.close_time);

  return (
    <PublicMenuClient
      slug={slug}
      businessName={tenant.business_name}
      businessLogoUrl={tenant.logo_url ?? ""}
      businessCoverImageUrl={tenant.cover_image_url ?? ""}
      publicDescription={tenant.public_description ?? ""}
      googleMapsUrl={tenant.google_maps_url ?? ""}
      hoursPair={{ open: tenant.open_time, close: tenant.close_time }}
      initialOpenStatus={initialOpenStatus}
      initialClosedMessage={initialClosedMessage}
      paymentFlags={paymentFlags}
      fulfillmentFlags={fulfillmentFlags}
      initialMenu={buildLocalMenuState({
        categories,
        products: (productRows ?? []) as MenuProductRow[],
      })}
    />
  );
}
