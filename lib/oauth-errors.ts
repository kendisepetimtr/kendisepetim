/** Supabase / Google OAuth hata metinlerini kullaniciya anlasilir Turkceye cevirir. */
export function humanizeOAuthError(message: string): string {
  const decoded = decodeURIComponent(message.replace(/\+/g, " "));
  const lower = decoded.toLowerCase();

  if (lower.includes("unable to exchange external code")) {
    return (
      "Google ile oturum acilamadi: Supabase, Google'dan gelen kodu dogrulayamadi. " +
      "Supabase → Authentication → Google bolumundeki Client ID ve Client Secret, " +
      "Google Cloud → Credentials altindaki OAuth istemcisi ile birebir ayni olmali. " +
      "Google tarafinda Authorized redirect URI olarak yalnizca su adres olmali: " +
      "https://mjfrwzgvjkodkobcslxf.supabase.co/auth/v1/callback " +
      "(localhost degil). OAuth uygulamasi «Testing» modundaysa Gmail adresinizi test kullanicisi olarak ekleyin."
    );
  }

  if (lower.includes("access_denied")) {
    return "Google girisi iptal edildi veya erisim reddedildi.";
  }

  return decoded;
}
