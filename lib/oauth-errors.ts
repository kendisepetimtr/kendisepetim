/** Supabase / Google OAuth hata metinlerini kullaniciya anlasilir Turkceye cevirir. */
export function humanizeOAuthError(message: string): string {
  const decoded = decodeURIComponent(message.replace(/\+/g, " "));
  const lower = decoded.toLowerCase();

  if (lower.includes("unable to exchange external code")) {
    return (
      "Google oturumu acilamadi (Supabase, Google kodunu dogrulayamadi). Asagidaki uc adimi sirayla kontrol edin:\n\n" +
      "1) Google Cloud → Credentials → OAuth 2.0 Web client → Authorized redirect URIs:\n" +
      "   https://mjfrwzgvjkodkobcslxf.supabase.co/auth/v1/callback\n" +
      "   (localhost veya kendisepetim.com BURAYA yazilmaz)\n\n" +
      "2) Supabase → Authentication → Providers → Google:\n" +
      "   Client ID ve Client Secret, Google'daki Web client ile birebir ayni olmali.\n" +
      "   Emin degilseniz Google'da yeni Client Secret olusturup Supabase'e yapistirin → Save.\n\n" +
      "3) Supabase → Authentication → URL Configuration:\n" +
      "   Site URL = https://kendisepetim.com (localhost birakmayin)\n" +
      "   Redirect URLs = https://kendisepetim.com/auth/callback ve http://localhost:3000/auth/callback\n\n" +
      "Testing modundaysa Google OAuth consent ekraninda Gmail adresinizi test kullanicisi olarak ekleyin."
    );
  }

  if (lower.includes("access_denied")) {
    return "Google girisi iptal edildi veya erisim reddedildi.";
  }

  return decoded;
}
