/** Türkiye cep telefonu doğrulama ve biçimlendirme. */

/** Girişten yalnızca rakamları alır. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * TR cep numarasını normalize eder. Geçerliyse `+90XXXXXXXXXX` (E.164) döner, değilse null.
 * Kabul edilen girişler: "05xx...", "5xx...", "905xx...", "+90 5xx ...".
 */
export function normalizeTrPhone(input: string): string | null {
  let d = digitsOnly(input);

  // Ülke kodu / baştaki sıfır temizliği
  if (d.startsWith("90")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);

  // Geriye 10 hane kalmalı ve cep numarası 5 ile başlamalı
  if (d.length !== 10 || d[0] !== "5") return null;

  return `+90${d}`;
}

export function isValidTrPhone(input: string): boolean {
  return normalizeTrPhone(input) !== null;
}

/** Görsel biçim: "+90 5XX XXX XX XX". Geçersizse girişi olduğu gibi döndürür. */
export function formatTrPhoneDisplay(input: string): string {
  const normalized = normalizeTrPhone(input);
  if (!normalized) return input;
  const d = normalized.slice(3); // +90 sonrası 10 hane
  return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/**
 * Fiş / kurye telefon biçimi: `0535 366 04 36` (4-3-2-2).
 * Geçersizse girişi olduğu gibi döndürür.
 */
export function formatTrPhoneReceipt(input: string): string {
  const normalized = normalizeTrPhone(input);
  if (!normalized) {
    const digits = digitsOnly(input);
    if (digits.length === 11 && digits.startsWith("0") && digits[1] === "5") {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
    }
    if (digits.length === 10 && digits[0] === "5") {
      return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    }
    return input;
  }
  const d = normalized.slice(3); // 10 hane, 5 ile başlar
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}
