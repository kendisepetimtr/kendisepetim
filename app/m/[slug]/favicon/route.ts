import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { resolveTenantFaviconAsset } from "@/lib/tenant-favicon";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: RouteContext): Promise<Response> {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();

  let logoUrl: string | null = null;

  if (isValidMenuSlug(slug)) {
    try {
      const svc = createServiceSupabaseClient();
      const { data: tenant } = await svc
        .from("tenants")
        .select("logo_url, public_menu_enabled")
        .eq("subdomain", slug)
        .maybeSingle();

      if (tenant?.public_menu_enabled === true) {
        logoUrl = tenant.logo_url;
      }
    } catch {
      logoUrl = null;
    }
  }

  const asset = await resolveTenantFaviconAsset(logoUrl);

  return new Response(asset.bytes, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
