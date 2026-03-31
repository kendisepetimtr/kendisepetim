"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { signOutAndReturnToLogin } from "../login/actions";

type NavKey = "overview" | "orders" | "menu_management" | "settings" | "ui_preview";

const TITLES: Record<NavKey, string> = {
  overview: "Genel bakış",
  orders: "Siparişler",
  menu_management: "Menü Yönetimi",
  settings: "Ayarlar",
  ui_preview: "Dashboard UI önizleme",
};

const DIP_NOTES: Record<NavKey, string> = {
  overview: "Özet, müşteri menü linki ve hızlı erişim.",
  orders: "Sipariş akışları kanal bazlı ayrı listelenir; aktif ve geçmiş görünüm her menüde bulunur.",
  menu_management: "Kategori ve ürünleri tek yerden yönetin.",
  settings: "Restoran ve menü görünümü — alt bölümler üst şeritte.",
  ui_preview: "Yerel geliştirme — diğer dashboard tasarım denemeleri.",
};

const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const DAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function formatDateTr(d: Date): string {
  const day = d.getDate();
  const month = MONTHS_TR[d.getMonth()] ?? "";
  const year = d.getFullYear();
  const dow = DAYS_TR[d.getDay()] ?? "";
  return `${day} ${month} ${year} · ${dow}`;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date | null {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function navKeyFromPathname(pathname: string): NavKey {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard?")) return "overview";
  if (pathname.startsWith("/dashboard/ui-preview")) return "ui_preview";
  if (pathname.startsWith("/dashboard/orders") || pathname.startsWith("/dashboard/masalar")) return "orders";
  if (
    pathname.startsWith("/dashboard/menu-management") ||
    pathname.startsWith("/dashboard/categories") ||
    pathname.startsWith("/dashboard/products")
  ) {
    return "menu_management";
  }
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  return "overview";
}

function linkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard?");
  if (href === "/dashboard/ui-preview") return pathname.startsWith("/dashboard/ui-preview");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardShellV7Props = {
  children: React.ReactNode;
  restaurantName: string;
  logoUrl: string | null;
  userEmail: string;
  showUiPreviewLink?: boolean;
  /** Canlı müşteri menüsü / site (üst hızlı işlemler şeridi) */
  customerMenuHref?: string | null;
  customerMenuFallbackHref?: string | null;
  tenantAdminHref?: string | null;
  tenantWaiterHref?: string | null;
  tenantCashierHref?: string | null;
  pendingOnlineOrdersCount?: number;
  pendingTableOrdersCount?: number;
  pendingPackageOrdersCount?: number;
  enableTableOrders?: boolean;
  enablePackageOrders?: boolean;
};

export function DashboardShellV7({
  children,
  restaurantName,
  logoUrl,
  userEmail,
  showUiPreviewLink = false,
  customerMenuHref = null,
  customerMenuFallbackHref = null,
  tenantAdminHref = null,
  tenantWaiterHref = null,
  tenantCashierHref = null,
  pendingOnlineOrdersCount = 0,
  pendingTableOrdersCount = 0,
  pendingPackageOrdersCount = 0,
  enableTableOrders = true,
  enablePackageOrders = true,
}: DashboardShellV7Props) {
  const pathname = usePathname() ?? "/dashboard";
  const search = useSearchParams();
  const section = navKeyFromPathname(pathname);
  const isOrderDetail = /^\/dashboard\/orders\/[^/]+$/.test(pathname);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateInput, setDateInput] = useState(() => toYmd(new Date()));

  const dateLine = useMemo(() => formatDateTr(viewDate), [viewDate]);

  const shiftDay = useCallback((delta: number) => {
    setViewDate((prev) => {
      const n = new Date(prev);
      n.setDate(n.getDate() + delta);
      return n;
    });
  }, []);

  const applyModalDate = useCallback(() => {
    const parsed = parseYmd(dateInput);
    if (parsed) setViewDate(parsed);
    setDateModalOpen(false);
  }, [dateInput]);

  const pageTitle = isOrderDetail ? "Sipariş detayı" : TITLES[section];
  const pageDip = isOrderDetail
    ? "Sipariş bilgileri ve durum güncellemesi."
    : section === "settings" && pathname.startsWith("/dashboard/settings/theme")
      ? "Menü şablonu, renk paleti ve yazı tipleri — müşteri menünüzün görünümü."
      : section === "settings"
        ? "Restoran adı, logo, marka rengi ve hesap durumu."
        : DIP_NOTES[section];

  const isSettingsSection = pathname.startsWith("/dashboard/settings");
  const settingsRestaurantActive =
    pathname === "/dashboard/settings" || pathname === "/dashboard/settings/";
  const settingsThemeActive = pathname.startsWith("/dashboard/settings/theme");

  const showQuickToolbar = Boolean(
    customerMenuHref ||
      customerMenuFallbackHref ||
      tenantAdminHref ||
      tenantWaiterHref ||
      tenantCashierHref ||
      isSettingsSection,
  );

  const showDateBar = section === "overview" || section === "orders" || isOrderDetail;

  const uiPreviewItem = showUiPreviewLink
    ? { href: "/dashboard/ui-preview", label: "UI önizleme", emoji: "\u{1F3A8}" as const }
    : null;
  const channel = (search?.get("channel") ?? "table").toLowerCase();

  return (
    <div className="relative isolate min-h-screen bg-white">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="relative flex min-h-screen flex-col md:flex-row">
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full w-[260px] max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:static md:z-0 md:h-auto md:min-h-screen md:max-w-none md:shadow-none ${
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${desktopCollapsed ? "md:w-[72px]" : "md:w-[240px]"}`}
        >
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 bg-white object-contain"
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] font-medium text-gray-400"
                  title="Logo — Ayarlardan ekleyebilirsiniz"
                >
                  Logo
                </div>
              )}
              {!desktopCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900">KendiSepetim</p>
                  <p className="truncate text-[11px] text-gray-500">{restaurantName}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setDesktopCollapsed((c) => !c)}
                className="hidden rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 md:inline"
                title="Menüyü daralt / aç"
              >
                {desktopCollapsed ? "»" : "«"}
              </button>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                linkActive(pathname, "/dashboard")
                  ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                  : "text-gray-600 hover:bg-gray-50"
              } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
              title={desktopCollapsed ? "Genel bakış" : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {"\u{1F4CA}"}
              </span>
              {!desktopCollapsed && <span>Genel bakış</span>}
            </Link>

            <Link
              href="/dashboard/orders?channel=online"
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                pathname.startsWith("/dashboard/orders") && channel === "online"
                  ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                  : "text-gray-600 hover:bg-gray-50"
              } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
              title={desktopCollapsed ? "Online Siparişler" : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {"\u{1F9FE}"}
              </span>
              {!desktopCollapsed && <span>Online Siparişler</span>}
              {pendingOnlineOrdersCount > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {pendingOnlineOrdersCount}
                </span>
              ) : null}
            </Link>
            {enableTableOrders ? (
              <Link
                href="/dashboard/orders?channel=table"
                onClick={() => setMobileOpen(false)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  pathname.startsWith("/dashboard/orders") && channel === "table"
                    ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                    : "text-gray-600 hover:bg-gray-50"
                } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
                title={desktopCollapsed ? "Masa Siparişleri" : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {"\u{1F37D}\uFE0F"}
                </span>
                {!desktopCollapsed && <span>Masa Siparişleri</span>}
                {pendingTableOrdersCount > 0 ? (
                  <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {pendingTableOrdersCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {enablePackageOrders ? (
              <Link
                href="/dashboard/orders?channel=package"
                onClick={() => setMobileOpen(false)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  pathname.startsWith("/dashboard/orders") && channel === "package"
                    ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                    : "text-gray-600 hover:bg-gray-50"
                } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
                title={desktopCollapsed ? "Paket Siparişleri" : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>
                  📦
                </span>
                {!desktopCollapsed && <span>Paket Siparişleri</span>}
                {pendingPackageOrdersCount > 0 ? (
                  <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {pendingPackageOrdersCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <Link
              href="/dashboard/menu-management"
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                linkActive(pathname, "/dashboard/menu-management") ||
                linkActive(pathname, "/dashboard/categories") ||
                linkActive(pathname, "/dashboard/products")
                  ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                  : "text-gray-600 hover:bg-gray-50"
              } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
              title={desktopCollapsed ? "Menü Yönetimi" : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {"\u{1F4D6}"}
              </span>
              {!desktopCollapsed && <span>Menü Yönetimi</span>}
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                linkActive(pathname, "/dashboard/settings")
                  ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                  : "text-gray-600 hover:bg-gray-50"
              } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
              title={desktopCollapsed ? "Ayarlar" : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {"\u2699\uFE0F"}
              </span>
              {!desktopCollapsed && <span>Ayarlar</span>}
            </Link>

            {uiPreviewItem ? (
              <Link
                href={uiPreviewItem.href}
                onClick={() => setMobileOpen(false)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  linkActive(pathname, uiPreviewItem.href)
                    ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                    : "text-gray-600 hover:bg-gray-50"
                } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
                title={desktopCollapsed ? uiPreviewItem.label : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {uiPreviewItem.emoji}
                </span>
                {!desktopCollapsed && <span>{uiPreviewItem.label}</span>}
              </Link>
            ) : null}
          </nav>

          <div className="mt-auto border-t border-gray-200 p-3">
            {!desktopCollapsed ? (
              <>
                <p className="text-xs font-semibold text-gray-900">{restaurantName}</p>
                <p className="mt-0.5 truncate text-[11px] text-gray-500">{userEmail}</p>
                <form action={signOutAndReturnToLogin} className="mt-3">
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Çıkış yap
                  </button>
                </form>
              </>
            ) : (
              <form action={signOutAndReturnToLogin} className="flex justify-center">
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg"
                  title="Çıkış"
                  aria-label="Çıkış yap"
                >
                  🚪
                </button>
              </form>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-gray-50/90 md:min-h-screen">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
            >
              Menü
            </button>
            <span className="truncate text-xs text-gray-500">{restaurantName}</span>
          </div>

          <div className="flex-1 p-4 sm:p-6">
            <div className="border-b border-gray-200/90 pb-5">
              {showQuickToolbar ? (
                <div
                  className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 bg-gray-50/95 pb-4 pt-1 backdrop-blur"
                  role="toolbar"
                  aria-label="Hızlı işlemler"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {isSettingsSection ? (
                      <nav
                        className="flex flex-wrap gap-1 rounded-lg bg-gray-200/60 p-1"
                        aria-label="Ayarlar bölümleri"
                      >
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setMobileOpen(false)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            settingsRestaurantActive
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Restoran
                        </Link>
                        <Link
                          href="/dashboard/settings/theme"
                          onClick={() => setMobileOpen(false)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            settingsThemeActive
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Tema
                        </Link>
                      </nav>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                    {tenantAdminHref ? (
                      <a
                        href={tenantAdminHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-800 transition hover:bg-indigo-50"
                      >
                        Admin
                      </a>
                    ) : null}
                    {tenantWaiterHref ? (
                      <a
                        href={tenantWaiterHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
                      >
                        Garson
                      </a>
                    ) : null}
                    {tenantCashierHref ? (
                      <a
                        href={tenantCashierHref}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        Kasa Modu
                      </a>
                    ) : null}
                    {customerMenuFallbackHref ? (
                      <a
                        href={customerMenuFallbackHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
                      >
                        Menü Alternatif
                      </a>
                    ) : null}
                    {customerMenuHref ? (
                      <a
                        href={customerMenuHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                      >
                        Menü
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {showDateBar ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => shiftDay(-1)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    aria-label="Önceki gün"
                  >
                    ◀
                  </button>
                  <p className="text-sm tracking-wide text-gray-400">{dateLine}</p>
                  <button
                    type="button"
                    onClick={() => shiftDay(1)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    aria-label="Sonraki gün"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateInput(toYmd(viewDate));
                      setDateModalOpen(true);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm hover:bg-gray-50"
                    title="Tarih seç"
                    aria-label="Tarih seç"
                  >
                    🔍
                  </button>
                </div>
              ) : null}
              <h1 className={`text-3xl font-light tracking-tight text-gray-900 sm:text-4xl ${showDateBar ? "mt-4" : "mt-0"}`}>
                {pageTitle}
              </h1>
              <p className="mt-2 text-sm text-gray-500">{pageDip}</p>
            </div>

            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>

      {dateModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDateModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-v7-date-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dash-v7-date-title" className="text-sm font-semibold text-gray-900">
              Tarih seç
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Görüntülemek istediğiniz günü seçin (ileride raporlarla eşlenecek).
            </p>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDateModalOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={applyModalDate}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
