/** E-posta / sifre girisi hata metinleri. */
export function humanizeLoginError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "E-posta veya sifre hatali.";
  }
  if (lower.includes("email not confirmed")) {
    return "E-posta adresiniz henuz dogrulanmamis. Gelen kutunuzdaki baglantiya tiklayin, ardindan tekrar giris yapin.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Cok fazla deneme. Lutfen biraz bekleyip tekrar deneyin.";
  }

  return message;
}
