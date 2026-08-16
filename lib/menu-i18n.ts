export type MenuLocale = "tr" | "en";

const KEY = "ks_menu_locale_v1";
const EVENT = "ks-menu-locale";

const STRINGS = {
  map: { tr: "Harita", en: "Map" },
  mapAria: { tr: "Konumu Google Maps’te aç", en: "Open location in Google Maps" },
  app: { tr: "Uygulama", en: "App" },
  appInstalled: { tr: "Yüklü", en: "Installed" },
  rateUs: { tr: "Bizi değerlendirin", en: "Rate us" },
  language: { tr: "Dil", en: "Language" },
  searchPlaceholder: { tr: "Lezzet keşfine çık...", en: "Search the menu..." },
  all: { tr: "Tümü", en: "All" },
  picksForYou: { tr: "Sizin İçin Seçtiklerimiz", en: "Picks for you" },
  signature: { tr: "İmza lezzet", en: "Signature" },
  popular: { tr: "Popüler", en: "Popular" },
  openNow: { tr: "Şu an açık", en: "Open now" },
  closedNow: { tr: "Şu an kapalı", en: "Closed now" },
  noHours: { tr: "Çalışma saati bilgisi yok", en: "Hours not set" },
  offline: {
    tr: "Çevrimdışısınız. Menüyü inceleyebilirsiniz ancak sipariş göndermek için internet gerekir.",
    en: "You’re offline. You can browse the menu, but you need internet to place an order.",
  },
  noProducts: {
    tr: "Bu işletme için henüz görünür ürün yok. Panelden menü ekleyebilirsiniz.",
    en: "No visible products yet.",
  },
  noSearch: { tr: "Aramanızla eşleşen ürün yok.", en: "No matching items." },
  location: { tr: "Konum", en: "Location" },
  locationHint: {
    tr: "Yol tarifi için Google Haritalar’da açın.",
    en: "Open in Google Maps for directions.",
  },
  openInMaps: { tr: "Haritada aç", en: "Open map" },
  inspect: { tr: "İncele", en: "Open" },
  addFavorite: { tr: "Favorilere ekle", en: "Add to favorites" },
  removeFavorite: { tr: "Favoriden çıkar", en: "Remove from favorites" },
  favRestaurant: { tr: "Restoranı favorile", en: "Favorite restaurant" },
  unfavRestaurant: { tr: "Restoranı favoriden çıkar", en: "Unfavorite restaurant" },
  restaurantClosed: { tr: "Restoran kapalı", en: "Restaurant closed" },
  addToCart: { tr: "Sepete ekle", en: "Add to cart" },
  cart: { tr: "Sepet", en: "Cart" },
  cartTitle: { tr: "Sepetiniz", en: "Your cart" },
  checkoutTitle: { tr: "Siparişi tamamla", en: "Checkout" },
  cartEmpty: { tr: "Sepetiniz boş. Menüden ürün ekleyin.", en: "Your cart is empty. Add items from the menu." },
  clearCart: { tr: "Sepeti boşalt", en: "Empty cart" },
  backToCart: { tr: "Sepete dön", en: "Back to cart" },
  close: { tr: "Kapat", en: "Close" },
  subtotal: { tr: "Ara toplam", en: "Subtotal" },
  orderType: { tr: "Sipariş tipi", en: "Order type" },
  deliveryAddress: { tr: "Teslimat adresi", en: "Delivery address" },
  confirmOrder: { tr: "Siparişi onayla", en: "Place order" },
  savingOrder: { tr: "Sipariş kaydediliyor…", en: "Placing order…" },
  saveOrder: { tr: "Siparişi kaydet", en: "Save order" },
  ingredients: { tr: "İçindekiler", en: "Ingredients" },
  customizeHint: {
    tr: "Seçeneklerinizi belirleyin ve istemediğiniz malzemeleri çıkarın.",
    en: "Choose options and remove ingredients you don’t want.",
  },
  removeHint: {
    tr: "İstemediğiniz malzemeleri çıkarabilirsiniz. Hiçbir şey seçmezseniz ürün standart gelir.",
    en: "You can remove ingredients. If you skip this, the item is served as listed.",
  },
  requiredSingle: { tr: "Zorunlu · tek seçim", en: "Required · pick one" },
  single: { tr: "Tek seçim", en: "Pick one" },
  multi: { tr: "Çoklu seçim", en: "Multiple" },
  login: { tr: "Giriş yap", en: "Log in" },
  register: { tr: "Kayıt ol", en: "Sign up" },
  account: { tr: "Hesabım", en: "Account" },
  explore: { tr: "Keşfet", en: "Explore" },
  orders: { tr: "Siparişlerim", en: "Orders" },
  favorites: { tr: "Favoriler", en: "Favorites" },
  addresses: { tr: "Adreslerim", en: "Addresses" },
  pickup: { tr: "Gel-al", en: "Pickup" },
  delivery: { tr: "Paket", en: "Delivery" },
  dineIn: { tr: "Masa", en: "Table" },
  table: { tr: "Masa", en: "Table" },
  items: { tr: "Ürün", en: "items" },
  continue: { tr: "Devam et", en: "Continue" },
  recommended: { tr: "İyi gider", en: "Goes well with" },
  languageComingSoon: {
    tr: "İngilizce metin yakında. Şimdilik yalnızca Türkçe kaydedilir.",
    en: "English copy is coming soon. Only Turkish is saved for now.",
  },
  addLanguage: { tr: "Dil ekle", en: "Add language" },
} as const;

export type MenuI18nKey = keyof typeof STRINGS;

export function isMenuLocale(v: unknown): v is MenuLocale {
  return v === "tr" || v === "en";
}

export function getMenuLocale(): MenuLocale {
  if (typeof window === "undefined") return "tr";
  try {
    const raw = window.localStorage.getItem(KEY);
    return isMenuLocale(raw) ? raw : "tr";
  } catch {
    return "tr";
  }
}

export function setMenuLocale(locale: MenuLocale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, locale);
  window.dispatchEvent(new Event(EVENT));
}

export function toggleMenuLocale(): MenuLocale {
  const next = getMenuLocale() === "tr" ? "en" : "tr";
  setMenuLocale(next);
  return next;
}

export function subscribeMenuLocale(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function t(key: MenuI18nKey, locale: MenuLocale = "tr"): string {
  return STRINGS[key][locale];
}

export function closedMessageForLocale(
  locale: MenuLocale,
  openTime: string,
  closeTime: string,
  trMessage: string,
): string {
  if (locale === "tr") return trMessage;
  return `Currently closed. Service hours: ${openTime} – ${closeTime}.`;
}
