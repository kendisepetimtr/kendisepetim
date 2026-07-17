/**
 * İşletme çalışma saatleri ve gün sonu modu (rapor / sipariş günü sınırı için).
 * QR menü “açık / kapalı” yalnızca açılış–kapanış aralığına göre hesaplanır (gece sarkan saatler dahil).
 */

export type BusinessHoursDayMode = "calendar" | "shift";

export const DEFAULT_OPEN_TIME = "09:00";
export const DEFAULT_CLOSE_TIME = "22:00";
export const BUSINESS_TIME_ZONE = "Europe/Istanbul";

/** "9:00" veya "09:00" → dakika; geçersizse null */
export function parseTimeToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

/** HH:mm biçimine çevirir; geçersizse varsayılan */
export function normalizeTimeString(s: string, fallback: string = DEFAULT_OPEN_TIME): string {
  const pm = parseTimeToMinutes(s);
  if (pm === null) return fallback;
  const h = Math.floor(pm / 60);
  const m = pm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesInTimeZone(now: Date, timeZone: string = BUSINESS_TIME_ZONE): number {
  try {
    const parts = new Intl.DateTimeFormat("tr-TR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
    /* fallback below */
  }
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Şu an açık mı? Kapanış açılıştan küçükse (örn. 03:00 < 09:00) gece sarkan vardiya kabul edilir.
 * Açılış === kapanış → 24 saat açık kabul edilir.
 */
export function isBusinessOpenNow(
  openTime: string,
  closeTime: string,
  now: Date = new Date(),
  timeZone: string = BUSINESS_TIME_ZONE,
): boolean {
  const o = parseTimeToMinutes(openTime);
  const c = parseTimeToMinutes(closeTime);
  if (o === null || c === null) return true;
  const cur = minutesInTimeZone(now, timeZone);
  if (c === o) return true;
  if (c > o) return cur >= o && cur < c;
  return cur >= o || cur < c;
}

export function getBusinessHoursRangeLabel(openTime: string, closeTime: string): string {
  return `${normalizeTimeString(openTime, DEFAULT_OPEN_TIME)} - ${normalizeTimeString(closeTime, DEFAULT_CLOSE_TIME)}`;
}

export function getBusinessClosedMessage(
  openTime: string,
  closeTime: string,
  now: Date = new Date(),
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  const o = parseTimeToMinutes(openTime);
  const c = parseTimeToMinutes(closeTime);
  const openLabel = normalizeTimeString(openTime, DEFAULT_OPEN_TIME);
  const rangeLabel = getBusinessHoursRangeLabel(openTime, closeTime);
  if (o === null || c === null) {
    return "Calisma saati bilgisi eksik.";
  }
  if (c === o) {
    return "Restoran 24 saat acik.";
  }

  const cur = minutesInTimeZone(now, timeZone);
  if (c > o) {
    return cur < o
      ? `Bugun ${openLabel}'da acilir. Servis saatleri: ${rangeLabel}`
      : `Yarin ${openLabel}'da acilir. Servis saatleri: ${rangeLabel}`;
  }

  return `Servis yeniden ${openLabel}'da baslar. Saatler: ${rangeLabel}`;
}
