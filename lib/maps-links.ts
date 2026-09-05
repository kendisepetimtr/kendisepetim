export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

/*
 * Not: Buradaki "kurye notuna konum bağlantısı ekle" yardımcıları kaldırıldı.
 * Kurye fişi konumu zaten QR kod olarak basıyor; notta bir kez daha görünmesi
 * aynı adresin üçüncü kez tekrar etmesine ve kuryenin hangi hedefe gideceğini
 * şaşırmasına yol açıyordu. Teslimat noktasının tek kaynağı haritadaki pindir.
 */
