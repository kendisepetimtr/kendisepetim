import React from "react";
import { ImageResponse } from "next/og";
import { isValidMenuSlug } from "@/lib/menu-subdomain";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { resolveTenantFaviconAsset, tenantFaviconAssetToDataUrl } from "@/lib/tenant-favicon";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const ALLOWED_ICON_SIZES = new Set([192, 512]);
const DEFAULT_ICON_SIZE = 512;

export const dynamic = "force-dynamic";

function parseRequestedIconSize(request: Request): number {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("size"));
  return ALLOWED_ICON_SIZES.has(raw) ? raw : DEFAULT_ICON_SIZE;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
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

  const size = parseRequestedIconSize(request);
  const asset = await resolveTenantFaviconAsset(logoUrl);
  const logoDataUrl = tenantFaviconAssetToDataUrl(asset);
  const logoSize = Math.round(size * 0.72);
  const radius = Math.max(24, Math.round(size * 0.22));

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: `${radius}px`,
        },
      },
      React.createElement("img", {
        src: logoDataUrl,
        alt: "",
        width: logoSize,
        height: logoSize,
        style: {
          objectFit: "contain",
        },
      }),
    ),
    {
      width: size,
      height: size,
    },
  );
}
