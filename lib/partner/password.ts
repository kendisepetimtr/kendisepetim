const SPECIAL_RE = /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/;
const UPPER_RE = /[A-ZÇĞİÖŞÜ]/;

export function partnerPasswordError(password: string): string | null {
  if (password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
  if (!UPPER_RE.test(password)) return "Şifrede en az bir büyük harf olmalıdır.";
  if (!/\d/.test(password)) return "Şifrede en az bir rakam olmalıdır.";
  if (!SPECIAL_RE.test(password)) return "Şifrede en az bir özel karakter olmalıdır.";
  return null;
}

export function generateOneTimePartnerPassword(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const chunk = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  return `Ks${chunk}!9`;
}
