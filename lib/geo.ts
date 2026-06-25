const EARTH_RADIUS_KM = 6371;

export type GeoPoint = {
  lat: number;
  lng: number;
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine mesafe (km). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinDeliveryRadius(
  restaurant: GeoPoint,
  customer: GeoPoint,
  radiusKm: number,
): boolean {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return false;
  return distanceKm(restaurant, customer) <= radiusKm;
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function asGeoPoint(
  lat: number | null | undefined,
  lng: number | null | undefined,
): GeoPoint | null {
  return isValidCoordinate(lat, lng) ? { lat, lng: lng as number } : null;
}

/** Supabase numeric(10,7) ile uyumlu yuvarlama. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

export function normalizeGeoPoint(point: GeoPoint): GeoPoint {
  return { lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) };
}
