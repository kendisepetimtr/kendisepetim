/** E-posta / sifre girisi hata metinleri. */
export function humanizeLoginError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid_grant") ||
    lower.includes("user not found") ||
    lower.includes("no user") ||
    lower.includes("email not found")
  ) {
    return "E-posta veya şifre hatalı. Bu bilgilerle kayıtlı hesap bulunamadı.";
  }
  if (lower.includes("email not confirmed")) {
    return "E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzdaki bağlantıya tıklayın, ardından tekrar giriş yapın.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin.";
  }

  return message;
}
