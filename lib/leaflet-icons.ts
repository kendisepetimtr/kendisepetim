/**
 * Harita pinleri — gömülü SVG.
 *
 * Leaflet'in varsayılan ikonları PNG olarak dışarıdan (unpkg CDN) çekiliyordu;
 * CDN yavaşladığında veya erişilemediğinde harita pinsiz kalıyordu. divIcon ile
 * ikon HTML'in içinde gider: ek istek yok, retina ekranda net, tema rengi verilebilir.
 *
 * Yalnızca tarayıcıda çalışan bileşenlerden import edin (ssr: false).
 */

import L from "leaflet";

/** Müşteri / teslimat noktası — klasik kırmızı damla pin. */
export const CUSTOMER_PIN_COLOR = "#e03127";
/** İşletme konumu — pazaryeri mavisi. */
export const RESTAURANT_PIN_COLOR = "#2563eb";

const PIN_WIDTH = 30;
const PIN_HEIGHT = 42;

function pinSvg(color: string, coreColor: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 30 42" aria-hidden="true">`,
    `<path d="M15 1.2a13 13 0 0 0-13 13c0 9.2 11.1 25 12.1 26.3a1.1 1.1 0 0 0 1.8 0C16.9 39.2 28 23.4 28 14.2a13 13 0 0 0-13-13z"`,
    ` fill="${color}" stroke="#ffffff" stroke-width="1.6"/>`,
    `<circle cx="15" cy="14.2" r="5.6" fill="${coreColor}"/>`,
    `</svg>`,
  ].join("");
}

function makePin(color: string, coreColor: string): L.DivIcon {
  return L.divIcon({
    html: pinSvg(color, coreColor),
    // Leaflet'in varsayılan beyaz kutu/gölge stilleri gelmesin
    className: "",
    iconSize: [PIN_WIDTH, PIN_HEIGHT],
    iconAnchor: [PIN_WIDTH / 2, PIN_HEIGHT],
    popupAnchor: [0, -PIN_HEIGHT + 8],
  });
}

let customerPin: L.DivIcon | null = null;
let restaurantPin: L.DivIcon | null = null;

export function customerPinIcon(): L.DivIcon {
  customerPin ??= makePin(CUSTOMER_PIN_COLOR, "#7f1710");
  return customerPin;
}

export function restaurantPinIcon(): L.DivIcon {
  restaurantPin ??= makePin(RESTAURANT_PIN_COLOR, "#15306e");
  return restaurantPin;
}
