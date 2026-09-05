export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

/**
 * Kurye fişi konumu QR olarak basılır; nota URL yazılmaz.
 * Eski siparişlerde kalan otomatik satır kayıtta temizlenir.
 */
export const COURIER_LOCATION_NOTE_PREFIX = "Konum (kurye):";

export function stripCourierLocationNoteLine(note: string): string {
  return note
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(COURIER_LOCATION_NOTE_PREFIX))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
