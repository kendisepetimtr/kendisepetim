import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocoding";
import { isValidCoordinate } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * Koordinat → mahalle / sokak. Müşteri haritada pini oynattıkça çağrılır.
 *
 * Herkese açık (QR menüde oturum yok). Bu yüzden IP başına hız sınırı var:
 * sağlayıcı ücretliye geçtiğinde (Google) kotayı kötüye kullanmayı zorlaştırır.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonim";
}

function overRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    // Süresi dolmuş kayıtları ara sıra temizle; sonsuza kadar birikmesin.
    if (buckets.size > 5_000) {
      for (const [k, v] of buckets) {
        if (now > v.resetAt) buckets.delete(k);
      }
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!isValidCoordinate(lat, lng)) {
    return NextResponse.json({ ok: false, error: "Geçersiz koordinat." }, { status: 400 });
  }

  if (overRateLimit(clientKey(request))) {
    return NextResponse.json(
      { ok: false, error: "Çok fazla istek. Biraz bekleyip tekrar deneyin." },
      { status: 429 },
    );
  }

  const result = await reverseGeocode(lat, lng);

  if (!result) {
    // Pin geçerli, yalnızca adres metni alınamadı — çağıran taraf bunu tıkanma saymaz.
    return NextResponse.json({ ok: true, address: null });
  }

  return NextResponse.json({ ok: true, address: result });
}
