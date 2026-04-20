export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

/** Sipariş notuna eklenecek tek satır (tıklanabilir URL düz metin) */
export function formatCourierLocationNoteLine(lat: number, lng: number): string {
  return `Konum (kurye): ${googleMapsPlaceUrl(lat, lng)}`;
}
