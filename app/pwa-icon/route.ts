import React from "react";
import { ImageResponse } from "next/og";

const ALLOWED = new Set([192, 512]);

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sizeRaw = Number(url.searchParams.get("size"));
  const size = ALLOWED.has(sizeRaw) ? sizeRaw : 512;
  const logoSrc = new URL("/ks-logo.png", url.origin).toString();
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
        src: logoSrc,
        alt: "",
        width: logoSize,
        height: logoSize,
        style: { objectFit: "contain" },
      }),
    ),
    { width: size, height: size },
  );
}
