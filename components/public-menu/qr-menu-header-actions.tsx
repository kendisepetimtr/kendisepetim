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
};

function actionClass(desktopSplit: boolean) {
  return [
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-surface-container-high p-3 text-on-surface transition-transform active:scale-95",
    desktopSplit ? "lg:flex-1 lg:gap-2 lg:px-4" : "",
  ].join(" ");
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
}: Props) {
  return (
    <div
      className={[
        "flex shrink-0 flex-col items-end gap-2",
        desktopSplit ? "lg:mt-5 lg:w-full lg:flex-row lg:items-stretch lg:justify-start" : "",
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
          <span className="material-symbols-outlined">location_on</span>
          {desktopSplit ? <span className="hidden text-xs font-bold lg:inline">{t("map")}</span> : null}
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
          <span className="material-symbols-outlined">star</span>
          {desktopSplit ? <span className="hidden text-xs font-bold lg:inline">{t("rateUs")}</span> : null}
        </a>
      ) : null}
      <button
        type="button"
        onClick={() => toggleMenuLocale()}
        className={actionClass(desktopSplit)}
        aria-label={t("language")}
        title={t("language")}
      >
        <span className="text-[11px] font-black tracking-wide">{locale.toUpperCase()}</span>
        {desktopSplit ? <span className="hidden text-xs font-bold lg:inline">{t("language")}</span> : null}
      </button>
      <button
        type="button"
        onClick={onInstall}
        disabled={appInstalled}
        className={[
          "inline-flex min-h-11 items-center justify-center rounded-2xl border px-3 py-2 text-xs font-bold transition",
          appInstalled
            ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-primary/15 bg-primary/8 text-primary hover:bg-primary/12",
          desktopSplit ? "lg:flex-1 lg:gap-2" : "",
        ].join(" ")}
        aria-label={appLabel}
        title={appLabel}
      >
        <span className="material-symbols-outlined text-[18px]">{appIcon}</span>
        {desktopSplit ? (
          <span className="hidden lg:inline">{appInstalled ? t("appInstalled") : t("app")}</span>
        ) : null}
      </button>
    </div>
  );
}
