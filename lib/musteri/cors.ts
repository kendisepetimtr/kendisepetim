import { NextResponse } from "next/server";

/** Restoran alt alan adı ↔ ana site çerezli API çağrıları. */
export function withMusteriCors<T>(res: NextResponse<T>, request: Request): NextResponse<T> {
  const origin = request.headers.get("origin");
  if (!origin) return res;
  let host = "";
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return res;
  }
  const allowed =
    host === "kendisepetim.com" ||
    host.endsWith(".kendisepetim.com") ||
    host === "localhost" ||
    host.endsWith(".localhost");
  if (!allowed) return res;
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Vary", "Origin");
  return res;
}
