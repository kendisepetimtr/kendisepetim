import { isValidMenuSlug, parseMenuSubdomainFromHost } from "@/lib/menu-subdomain";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();

  if (!isValidMenuSlug(slug)) {
    return Response.json({ name: "KendiSepetim Menu" }, { status: 404 });
  }

  const host = request.headers.get("host");
  const hostSlug = parseMenuSubdomainFromHost(host);
  const isDedicatedSubdomain = hostSlug === slug;
  const startUrl = isDedicatedSubdomain ? "/" : `/m/${encodeURIComponent(slug)}`;
  const scope = isDedicatedSubdomain ? "/" : `/m/${encodeURIComponent(slug)}`;

  let appName = slug.charAt(0).toUpperCase() + slug.slice(1);
  let description = `${appName} dijital menu`;

  try {
    const svc = createServiceSupabaseClient();
    const { data: tenant } = await svc
      .from("tenants")
      .select("business_name, public_description, public_menu_enabled")
      .eq("subdomain", slug)
      .maybeSingle();

    if (!tenant || tenant.public_menu_enabled !== true) {
      return Response.json({ name: "KendiSepetim Menu" }, { status: 404 });
    }

    appName = tenant.business_name?.trim() || appName;
    description = tenant.public_description?.trim() || `${appName} dijital menu`;
  } catch {
    return Response.json({ name: "KendiSepetim Menu" }, { status: 503 });
  }

  const shortName = appName.length > 24 ? `${appName.slice(0, 21).trimEnd()}...` : appName;
  const iconBase = `/m/${encodeURIComponent(slug)}/icon`;
  const manifest = {
    id: startUrl,
    name: appName,
    short_name: shortName,
    description,
    lang: "tr",
    dir: "ltr",
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f6",
    theme_color: "#bc000c",
    icons: [
      {
        src: `${iconBase}?size=192`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${iconBase}?size=512`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
