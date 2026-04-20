import { promises as fs } from "fs";
import path from "path";

export type TenantFaviconAsset = {
  bytes: Uint8Array;
  contentType: string;
};

const DEFAULT_FAVICON_CONTENT_TYPE = "image/png";
const DEFAULT_FAVICON_PATH = path.join(process.cwd(), "public", "ks-logo.png");

let defaultFaviconAssetPromise: Promise<TenantFaviconAsset> | null = null;

function normalizeImageContentType(contentType: string | null): string {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return normalized.startsWith("image/") ? normalized : DEFAULT_FAVICON_CONTENT_TYPE;
}

function parseDataUrlAsset(value: string): TenantFaviconAsset | null {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+)?(?:;(base64))?,(.*)$/i);
  if (!match) return null;

  const [, mimeType, encoding, body] = match;
  try {
    const decoded =
      encoding === "base64"
        ? Buffer.from(body, "base64")
        : Buffer.from(decodeURIComponent(body), "utf8");
    return {
      bytes: new Uint8Array(decoded),
      contentType: normalizeImageContentType(mimeType ?? null),
    };
  } catch {
    return null;
  }
}

export async function getDefaultFaviconAsset(): Promise<TenantFaviconAsset> {
  if (!defaultFaviconAssetPromise) {
    defaultFaviconAssetPromise = fs.readFile(DEFAULT_FAVICON_PATH).then((bytes) => ({
      bytes: new Uint8Array(bytes),
      contentType: DEFAULT_FAVICON_CONTENT_TYPE,
    }));
  }
  return defaultFaviconAssetPromise;
}

export async function resolveTenantFaviconAsset(
  logoUrl: string | null | undefined,
): Promise<TenantFaviconAsset> {
  const trimmed = logoUrl?.trim() ?? "";
  if (!trimmed || trimmed === "/ks-logo.png") {
    return getDefaultFaviconAsset();
  }

  const inlineAsset = parseDataUrlAsset(trimmed);
  if (inlineAsset) return inlineAsset;

  if (!/^https?:\/\//i.test(trimmed)) {
    return getDefaultFaviconAsset();
  }

  try {
    const response = await fetch(trimmed, { cache: "no-store" });
    if (!response.ok) throw new Error(`favicon fetch failed: ${response.status}`);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: normalizeImageContentType(response.headers.get("content-type")),
    };
  } catch {
    return getDefaultFaviconAsset();
  }
}

export function tenantFaviconAssetToDataUrl(asset: TenantFaviconAsset): string {
  return `data:${asset.contentType};base64,${Buffer.from(asset.bytes).toString("base64")}`;
}
