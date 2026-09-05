/**
 * Müşteri konumu — tarayıcı Geolocation API sarmalayıcısı.
 *
 * Neden tek noktada: "izin verdim ama konum gelmiyor" vakaları yanlış teşhis
 * ediliyordu. Artık hata kodu korunuyor (izin / sağlayıcı / zaman aşımı ayrı),
 * güvenli bağlam (https) önden kontrol ediliyor ve deneme iki aşamalı:
 * önce hızlı-kaba (kapalı mekânda ve masaüstünde çalışır), gerekirse GPS.
 *
 * Konum hiçbir koşulda zorunlu tek yol değildir — çağıran taraf hata alınca
 * kullanıcıya haritadan işaretleme sunar (bkz. components/customer/customer-location-field).
 */

const KEY = "ks_customer_geo_v1";

export type CustomerGeo = {
  lat: number;
  lng: number;
  /** Tarayıcının bildirdiği yarıçap hatası (metre) — kabaysa kullanıcıyı uyarırız. */
  accuracyM?: number;
};

export type CustomerGeoErrorCode =
  /** Tarayıcıda Geolocation API yok */
  | "unsupported"
  /** Sayfa https değil — API sessizce reddeder, "izin verilmedi" gibi görünür */
  | "insecure"
  /** İzin reddedildi: site izni ya da işletim sistemi seviyesindeki konum servisi */
  | "denied"
  /** Sağlayıcı sonuç üretemedi (GPS kapalı, sinyal yok) */
  | "unavailable"
  /** Süre doldu */
  | "timeout";

export class CustomerGeoError extends Error {
  readonly code: CustomerGeoErrorCode;

  constructor(code: CustomerGeoErrorCode, message: string) {
    super(message);
    this.name = "CustomerGeoError";
    this.code = code;
  }
}

/** Kullanıcıya gösterilecek metin — her kod için gerçekten uygulanabilir bir adım içerir. */
export function customerGeoErrorMessage(code: CustomerGeoErrorCode): string {
  switch (code) {
    case "unsupported":
      return "Bu tarayıcı konum paylaşımını desteklemiyor. Aşağıdaki haritadan konumunuzu işaretleyebilirsiniz.";
    case "insecure":
      return "Konum yalnızca güvenli (https) bağlantıda alınabilir. Aşağıdaki haritadan konumunuzu işaretleyin.";
    case "denied":
      return "Tarayıcı konum iznini reddetti. iPhone'da Ayarlar → Gizlilik ve Güvenlik → Konum Servisleri → Safari Web Siteleri açık olmalı; siteyi ana ekrana eklediyseniz izni orada ayrıca vermeniz gerekir. Dilerseniz haritadan işaretleyin.";
    case "unavailable":
      return "Cihaz şu anda konum üretemedi (konum servisi kapalı veya sinyal yok). Haritadan konumunuzu işaretleyin.";
    case "timeout":
      return "Konum zamanında alınamadı. Tekrar deneyebilir veya haritadan işaretleyebilirsiniz.";
  }
}

/** Hızlı deneme: ağ/hücre tabanlı, kapalı mekânda ve masaüstünde de sonuç verir. */
const FAST_ATTEMPT: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 300_000,
};

/** İkinci deneme: GPS kilidi bekler — açık havada birkaç metreye iner. */
const PRECISE_ATTEMPT: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 0,
};

/** GeolocationPositionError.code → bizim kod. Duck-typing: sunucu bundle'ında global aranmasın. */
function toGeoErrorCode(error: unknown): CustomerGeoErrorCode {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

function getPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function getSavedCustomerGeo(): CustomerGeo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CustomerGeo;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Gizli sekmede localStorage yazmak hata fırlatır — konum akışı bu yüzden kırılmasın. */
export function saveCustomerGeo(geo: CustomerGeo): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(geo));
  } catch {
    /* kalıcı saklama opsiyonel */
  }
}

/**
 * Konumu ister. Başarısızlıkta `CustomerGeoError` fırlatır — `code` alanı
 * hangi adımın önerileceğini belirler.
 */
export async function requestCustomerGeo(): Promise<CustomerGeo> {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
    throw new CustomerGeoError("unsupported", customerGeoErrorMessage("unsupported"));
  }

  // https olmadan tarayıcı "izin reddedildi" der; kullanıcıyı yanlış ayara göndermeyelim.
  if (window.isSecureContext === false) {
    throw new CustomerGeoError("insecure", customerGeoErrorMessage("insecure"));
  }

  let lastCode: CustomerGeoErrorCode = "unavailable";

  for (const attempt of [FAST_ATTEMPT, PRECISE_ATTEMPT]) {
    try {
      const pos = await getPositionOnce(attempt);
      const geo: CustomerGeo = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
      };
      saveCustomerGeo(geo);
      return geo;
    } catch (error) {
      lastCode = toGeoErrorCode(error);
      // İzin reddedildiyse ikinci deneme de reddedilir; kullanıcıyı 20 sn bekletmeyelim.
      if (lastCode === "denied") break;
    }
  }

  throw new CustomerGeoError(lastCode, customerGeoErrorMessage(lastCode));
}
