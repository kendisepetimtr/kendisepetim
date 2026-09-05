export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

/** Kurye not satırının sabit başı — satırı tanıyıp güncelleyebilmek için tek kaynak. */
export const COURIER_LOCATION_NOTE_PREFIX = "Konum (kurye):";

/** Sipariş notuna eklenecek tek satır (tıklanabilir URL düz metin) */
export function formatCourierLocationNoteLine(lat: number, lng: number): string {
  return `${COURIER_LOCATION_NOTE_PREFIX} ${googleMapsPlaceUrl(lat, lng)}`;
}

/**
 * Kurye notundaki konum satırını tek ve güncel tutar.
 * Konum birkaç kez değişebildiği için (GPS, harita, kayıtlı adres) eski satır
 * silinip yenisi yazılır; not böylece birikmez.
 */
export function withCourierLocationNoteLine(
  note: string,
  point: { lat: number; lng: number } | null,
): string {
  const stripped = note
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(COURIER_LOCATION_NOTE_PREFIX))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!point) return stripped;

  const line = formatCourierLocationNoteLine(point.lat, point.lng);
  return stripped ? `${stripped}\n\n${line}` : line;
}
