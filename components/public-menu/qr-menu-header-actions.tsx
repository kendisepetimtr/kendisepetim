"use client";

import { toggleMenuLocale, type MenuI18nKey, type MenuLocale } from "@/lib/menu-i18n";

type Props = {
  googleMapsUrl: string;
  googleReviewsUrl: string;
  desktopSplit: boolean;
  locale: MenuLocale;
  t: (key: MenuI18nKey) => string;
  appInstalled: boolean;
  appLabel: string;
  appIcon: string;
  onInstall: () => void;
  showAppInstall?: boolean;
};

function actionClass(desktopSplit: boolean) {
  return [
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-surface-container-high p-3 text-on-surface transition-transform active:scale-95",
    desktopSplit
      ? "lg:min-h-[4.75rem] lg:w-full lg:flex-col lg:gap-1 lg:rounded-2xl lg:px-2 lg:py-3"
      : "",
  ].join(" ");
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden max-w-full px-0.5 text-center text-[11px] font-bold leading-tight lg:block lg:line-clamp-2">
      {children}
    </span>
  );
}

export default function QrMenuHeaderActions({
  googleMapsUrl,
  googleReviewsUrl,
  desktopSplit,
  locale,
  t,
  appInstalled,
  appLabel,
  appIcon,
  onInstall,
  showAppInstall = true,
}: Props) {
  return (
    <div
      className={[
        "flex shrink-0 flex-col items-end gap-2",
        desktopSplit ? "lg:mt-5 lg:grid lg:w-full lg:grid-cols-2 lg:items-stretch lg:gap-2.5" : "",
      ].join(" ")}
    >
      {googleMapsUrl ? (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className={actionClass(desktopSplit)}
          aria-label={t("mapAria")}
          title={t("map")}
        >
          <span className="material-symbols-outlined text-[22px] lg:text-[26px]">location_on</span>
          {desktopSplit ? <Label>{t("map")}</Label> : null}
        </a>
      ) : null}
      {googleReviewsUrl ? (
        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noreferrer"
          className={actionClass(desktopSplit)}
          aria-label={t("rateUs")}
          title={t("rateUs")}
        >
          <span className="material-symbols-outlined text-[22px] lg:text-[26px]">star</span>
          {desktopSplit ? <Label>{t("rateUs")}</Label> : null}
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => toggleMenuLocale()}
        className={actionClass(desktopSplit)}
        aria-label={t("language")}
        title={t("language")}
      >
        <span className="text-[11px] font-black tracking-wide lg:text-sm">{locale.toUpperCase()}</span>
        {desktopSplit ? <Label>{t("language")}</Label> : null}
      </button>
      {showAppInstall ? (
        <button
          type="button"
          onClick={onInstall}
          disabled={appInstalled}
          className={[
            "inline-flex min-h-11 items-center justify-center rounded-2xl border px-3 py-2 text-xs font-bold transition",
            appInstalled
              ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-primary/15 bg-primary/8 text-primary hover:bg-primary/12",
            desktopSplit ? "lg:min-h-[4.75rem] lg:w-full lg:flex-col lg:gap-1 lg:px-2 lg:py-3" : "",
          ].join(" ")}
          aria-label={appLabel}
          title={appLabel}
        >
          <span className="material-symbols-outlined text-[18px] lg:text-[26px]">{appIcon}</span>
          {desktopSplit ? <Label>{appInstalled ? t("appInstalled") : t("app")}</Label> : null}
        </button>
      ) : null}
    </div>
  );
}
