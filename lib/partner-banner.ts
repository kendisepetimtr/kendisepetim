const KEY = "ks_partner_banner_dismissed_v1";

export function isPartnerBannerDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "1";
}

export function dismissPartnerBanner(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
}
