"use client";

import CustomersManager from "@/components/dashboard/customers-manager";
import DashboardOrdersList from "@/components/dashboard/dashboard-orders-list";
import DashboardNotificationsBell from "@/components/dashboard/dashboard-notifications-bell";
import DashboardReports from "@/components/dashboard/dashboard-reports";
import DashboardQrSubdomain from "@/components/dashboard/dashboard-qr-subdomain";
import DashboardSettings from "@/components/dashboard/dashboard-settings";
import MarketplaceSettingsPanel from "@/components/dashboard/marketplace-settings-panel";
import MenuManager from "@/components/dashboard/menu-manager";
import type { DashboardTenantSyncResult } from "@/lib/dashboard/tenant-sync";
import SidebarBrandRotator from "@/components/dashboard/sidebar-brand-rotator";
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTOR_LABELS,
  formatActivityLogSummary as formatLogSummary,
} from "@/lib/dashboard/activity-log-labels";
import { fulfillmentTypeLabel } from "@/lib/fulfillment";
import { clearLocalCustomers, countLocalCustomers, getLocalCustomers } from "@/lib/local-customers";
import { clearLocalOrders } from "@/lib/local-orders";
import { clearPublicCheckoutMirror, writePublicCheckoutMirror } from "@/lib/public-checkout-mirror";
import { clearLocalTenant, getLocalTenant, saveLocalTenant, type LocalTenantProfile } from "@/lib/local-tenant";
import { mergeDashboardTenantProfiles } from "@/lib/tenant-client-sync";
import { getDashboardQuickLinks, getPublicMenuConnectionLinks } from "@/lib/public-menu-urls";
import { useDashboardOrderNotifications } from "@/lib/hooks/use-dashboard-order-notifications";
import { useDashboardReceiptPrint } from "@/lib/hooks/use-receipt-print";
import type { AdminOrder } from "@/lib/orders";
import {
  buildOrdersReportSummary,
  filterOrdersByPeriod,
  formatTry,
  getOrdersForRelativeReportDay,
} from "@/lib/orders-report";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { LocalMenuProduct } from "@/lib/local-menu";
import type { ActivityLogRow } from "@/lib/supabase/activity-log-types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "kendisepetim_sidebar_collapsed_v1";

const NAV_MAIN = [
  { id: "overview", label: "Özet", icon: "space_dashboard" },
  { id: "orders", label: "Siparişler", icon: "receipt_long" },
  { id: "menu", label: "Menü", icon: "restaurant_menu" },
  { id: "customers", label: "Müşteriler", icon: "group" },
  { id: "qr", label: "QR", icon: "qr_code_2" },
  { id: "marketplace", label: "Marketplace", icon: "storefront" },
  { id: "reports", label: "Raporlar", icon: "bar_chart" },
] as const;

const NAV_SETTINGS = { id: "settings", label: "Ayarlar", icon: "settings" } as const;

type SidebarNavItem = { readonly id: string; readonly label: string; readonly icon: string };

function SidebarNavButton({
  item,
  active,
  onSelect,
  railMode,
  alertActive = false,
}: {
  item: SidebarNavItem;
  active: boolean;
  onSelect: () => void;
  /** Masaüstü dar sidebar: yalnızca ikon; etiket sr-only + title */
  railMode: boolean;
  alertActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={alertActive ? `${item.label} — yeni sipariş` : item.label}
      aria-label={alertActive ? `${item.label}, yeni sipariş bildirimi` : item.label}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex w-full items-center gap-3 rounded-xl py-3 text-sm font-medium transition-[transform,color,background-color] duration-300 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0",
        railMode
          ? "max-lg:px-3 max-lg:text-left lg:justify-center lg:gap-0 lg:px-2 lg:hover:translate-x-0 lg:transition-[transform,color,background-color] lg:duration-200 lg:hover:bg-surface-container-low lg:active:bg-surface-container-high/80"
          : "justify-start px-3 text-left",
        alertActive && !active ? "animate-pulse bg-amber-500/10 text-amber-900" : "",
        active
          ? "bg-primary/10 text-primary " +
            (railMode
              ? "max-lg:hover:translate-x-2.5 lg:hover:bg-primary/15"
              : "hover:translate-x-2.5")
          : "text-secondary " +
            (railMode
              ? "max-lg:hover:translate-x-2.5 max-lg:hover:text-on-background lg:hover:text-primary"
              : "hover:translate-x-2.5 hover:text-on-background"),
      ].join(" ")}
    >
      <span
        className={[
          "material-symbols-outlined shrink-0 text-[22px] transition-transform duration-200 ease-out motion-reduce:transition-none",
          active ? "text-primary" : alertActive ? "text-amber-700" : "text-secondary",
          railMode
            ? "lg:group-hover:scale-110 lg:group-hover:-rotate-3 lg:group-active:scale-95 motion-reduce:lg:group-hover:scale-100 motion-reduce:lg:group-hover:rotate-0"
            : "",
        ].join(" ")}
        aria-hidden
      >
        {item.icon}
      </span>
      <span className={railMode ? "lg:sr-only" : ""}>{item.label}</span>
      {alertActive ? (
        <span
          className={[
            "absolute top-2 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white",
            railMode ? "right-2 max-lg:right-3 lg:right-1.5" : "right-3",
          ].join(" ")}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

function getNavLabel(navId: string): string {
  if (navId === NAV_SETTINGS.id) return NAV_SETTINGS.label;
  const m = NAV_MAIN.find((n) => n.id === navId);
  return m?.label ?? "Panel";
}

async function fetchDashboardTenantProfile(): Promise<DashboardTenantSyncResult> {
  try {
    const res = await fetch("/api/dashboard/tenant", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as DashboardTenantSyncResult;
    if (data && typeof data === "object" && "ok" in data) {
      return data;
    }
    return { ok: false, error: "Profil yanıtı geçersiz." };
  } catch {
    return { ok: false, error: "Profil senkronu başarısız." };
  }
}

async function fetchDashboardMenuProductCount(): Promise<number> {
  try {
    const res = await fetch("/api/dashboard/menu/count", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchDashboardOrders(): Promise<AdminOrder[]> {
  try {
    const res = await fetch("/api/dashboard/orders?channel=all", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; orders?: AdminOrder[] };
    if (!res.ok || !data.ok) return [];
    return data.orders ?? [];
  } catch {
    return [];
  }
}

async function fetchDashboardActiveTables(): Promise<number> {
  try {
    const res = await fetch("/api/dashboard/tables", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; activeCount?: number };
    if (!res.ok || !data.ok) return 0;
    return data.activeCount ?? 0;
  } catch {
    return 0;
  }
}

async function fetchDashboardMenuPreview(): Promise<LocalMenuProduct[]> {
  try {
    const res = await fetch("/api/dashboard/menu", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as {
      ok?: boolean;
      state?: { products?: LocalMenuProduct[] };
    };
    if (!res.ok || !data.ok) return [];
    const products = (data.state?.products ?? []).filter((p) => !p.hidden);
    const featured = products.filter((p) => p.signatureDish);
    return (featured.length > 0 ? [...featured, ...products.filter((p) => !p.signatureDish)] : products).slice(
      0,
      6,
    );
  } catch {
    return [];
  }
}

async function fetchDashboardActivityLogs(): Promise<ActivityLogRow[]> {
  try {
    const res = await fetch("/api/dashboard/activity-logs", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; logs?: ActivityLogRow[] };
    if (!res.ok || !data.ok) return [];
    return data.logs ?? [];
  } catch {
    return [];
  }
}

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

function countDistinctCustomers(orders: AdminOrder[], subdomain: string): number {
  const keys = new Set<string>();
  for (const c of getLocalCustomers(subdomain).customers) {
    const k = phoneKey(c.phone);
    if (k.length >= 7) keys.add(k);
  }
  for (const o of orders) {
    const k = phoneKey(o.phone || "");
    if (k.length >= 7) keys.add(k);
  }
  return keys.size > 0 ? keys.size : countLocalCustomers(subdomain);
}

function activityIcon(action: string): string {
  if (action.includes("order")) return "receipt_long";
  if (action.includes("payment") || action.includes("bill")) return "payments";
  if (action.includes("courier") || action.includes("delivery")) return "delivery_dining";
  if (action.includes("menu")) return "restaurant_menu";
  if (action.includes("receipt") || action.includes("notification")) return "tune";
  return "history";
}

function orderChannelLabel(order: AdminOrder): string {
  if (order.fulfillmentType === "dine_in") {
    return order.tableNumber != null ? `Masa ${order.tableNumber}` : "Masa";
  }
  return fulfillmentTypeLabel(order.fulfillmentType);
}

function DashboardPlaceholder({ navId }: { navId: string }) {
  const label = getNavLabel(navId);
  return (
    <div className="py-16 text-center sm:py-24">
      <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
        {label}
      </h1>
      <p className="mt-3 text-sm text-secondary">Bu bölüm yakında kullanıma açılacak.</p>
    </div>
  );
}

type DashboardClientProps = {
  /** Supabase oturumu açıksa çıkışta sunucu oturumu da kapatılır */
  remoteAuthEnabled?: boolean;
};

export default function DashboardClient({ remoteAuthEnabled = false }: DashboardClientProps) {
  const router = useRouter();
  const [tenant, setTenant] = useState<LocalTenantProfile | null | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [menuProductCount, setMenuProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [overviewOrders, setOverviewOrders] = useState<AdminOrder[]>([]);
  const [activeTableCount, setActiveTableCount] = useState(0);
  const [menuPreview, setMenuPreview] = useState<LocalMenuProduct[]>([]);
  const [overviewLogs, setOverviewLogs] = useState<ActivityLogRow[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const { printOrderIfAutoOnCreate } = useDashboardReceiptPrint(
    tenant?.businessName ?? "",
    tenant?.subdomain ?? "",
  );

  const handleOrderCreated = useCallback(
    (log: ActivityLogRow) => {
      if (!log.entity_id || !tenant) return;
      void printOrderIfAutoOnCreate(log.entity_id);
    },
    [printOrderIfAutoOnCreate, tenant],
  );

  const {
    pendingOrderAlert,
    ordersRefreshKey,
    toasts,
    dismissToast,
    connected,
    formatToastTitle,
    formatActivityLogSummary,
    activityLogs,
    setActivityLogs,
  } = useDashboardOrderNotifications({
    enabled: remoteAuthEnabled,
    ordersTabActive: activeNav === "orders",
    presenceScope: tenant?.subdomain,
    onOrderCreated: handleOrderCreated,
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsedPersist = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateTenant() {
      try {
        const local = getLocalTenant();

        if (remoteAuthEnabled) {
          const result = await fetchDashboardTenantProfile();
          if (cancelled) return;

          if (!result.ok) {
            if (!local) {
              router.replace("/kayit");
              setTenant(null);
              return;
            }
            setTenant(local);
            writePublicCheckoutMirror(local);
            return;
          }

          const merged = mergeDashboardTenantProfiles(local, result.profile);
          saveLocalTenant(merged);
          setTenant(merged);
          writePublicCheckoutMirror(merged);
          return;
        }

        if (!local) {
          router.replace("/kayit");
          setTenant(null);
          return;
        }
        setTenant(local);
        writePublicCheckoutMirror(local);
      } catch {
        if (cancelled) return;
        const local = getLocalTenant();
        if (local) {
          setTenant(local);
          writePublicCheckoutMirror(local);
          return;
        }
        router.replace("/giris?next=/dashboard");
        setTenant(null);
      }
    }

    void hydrateTenant();
    return () => {
      cancelled = true;
    };
  }, [router, remoteAuthEnabled]);

  useEffect(() => {
    if (!tenant) return;
    if (remoteAuthEnabled) {
      void fetchDashboardMenuProductCount()
        .then((count) => setMenuProductCount(count))
        .catch(() => setMenuProductCount(0));
    } else {
      setMenuProductCount(0);
      setCustomerCount(countLocalCustomers(tenant.subdomain));
    }
  }, [tenant, activeNav, remoteAuthEnabled]);

  useEffect(() => {
    if (!tenant || activeNav !== "overview") return;

    const currentTenant = tenant;
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      try {
        if (remoteAuthEnabled) {
          const [orders, tables, preview, logs] = await Promise.all([
            fetchDashboardOrders(),
            fetchDashboardActiveTables(),
            fetchDashboardMenuPreview(),
            fetchDashboardActivityLogs(),
          ]);
          if (cancelled) return;
          setOverviewOrders(orders);
          setActiveTableCount(tables);
          setMenuPreview(preview);
          setOverviewLogs(logs.slice(0, 8));
          setCustomerCount(countDistinctCustomers(orders, currentTenant.subdomain));
        } else {
          if (cancelled) return;
          setOverviewOrders([]);
          setActiveTableCount(0);
          setMenuPreview([]);
          setOverviewLogs([]);
          setCustomerCount(countLocalCustomers(currentTenant.subdomain));
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [tenant, activeNav, remoteAuthEnabled, ordersRefreshKey]);

  // Canlı aktivite akışı overview listesini günceller
  useEffect(() => {
    if (activeNav !== "overview") return;
    if (activityLogs.length === 0) return;
    setOverviewLogs(activityLogs.slice(0, 8));
  }, [activityLogs, activeNav]);

  const reportDayConfig = useMemo(
    () =>
      tenant
        ? {
            hoursDayMode: tenant.hoursDayMode,
            openTime: tenant.openTime,
            closeTime: tenant.closeTime,
          }
        : undefined,
    [tenant],
  );

  const todayOrderCount = useMemo(() => {
    if (!tenant) return 0;
    return getOrdersForRelativeReportDay(overviewOrders, 0, reportDayConfig).length;
  }, [overviewOrders, reportDayConfig, tenant]);

  const salesSummary = useMemo(() => {
    const filtered = filterOrdersByPeriod(overviewOrders, "7d", new Date(), reportDayConfig);
    return buildOrdersReportSummary(filtered, reportDayConfig);
  }, [overviewOrders, reportDayConfig]);

  const maxDayRevenue = useMemo(
    () => salesSummary.byDay.reduce((max, row) => Math.max(max, row.revenue), 0),
    [salesSummary.byDay],
  );

  const recentOrders = useMemo(() => overviewOrders.slice(0, 8), [overviewOrders]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  async function handleSignOut() {
    const t = getLocalTenant();
    if (t) {
      clearLocalCustomers(t.subdomain);
      clearLocalOrders(t.subdomain);
      clearPublicCheckoutMirror(t.subdomain);
    }
    clearLocalTenant();
    if (remoteAuthEnabled) {
      try {
        await fetch("/api/dashboard/sign-out", { method: "POST", credentials: "include" });
      } catch {
        /* sunucu oturumu kapanmazsa yine ana sayfaya yönlendir */
      }
    }
    router.push("/giris");
  }

  if (tenant === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-secondary">
          <span className="material-symbols-outlined animate-pulse text-4xl text-primary" aria-hidden>
            hourglass_empty
          </span>
          <p className="text-sm font-medium">Panel yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (tenant === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-secondary">Kayıt sayfasına yönlendiriliyorsunuz…</p>
      </div>
    );
  }

  const registered = new Date(tenant.registeredAt);
  const firstName = tenant.ownerName.split(/\s+/)[0] || "işletme";
  const initials = ownerInitials(tenant.ownerName);

  /** Sidebar’daki bağlantı alanı — menü + personel panelleri. */
  const quickLinks = remoteAuthEnabled
    ? getDashboardQuickLinks(tenant.subdomain)
    : getPublicMenuConnectionLinks(tenant.subdomain);

  const dateSubtitle = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const headerTitle =
    activeNav === "overview"
      ? "Özet"
      : activeNav === "menu"
        ? "Menü"
        : activeNav === "customers"
          ? "Müşteriler"
          : activeNav === "orders"
            ? "Siparişler"
            : getNavLabel(activeNav);
  const headerSubtitle =
    activeNav === "overview"
      ? dateSubtitle
      : activeNav === "menu"
        ? "Kategoriler ve ürünler"
        : activeNav === "customers"
          ? "Kayıtlı müşteriler ve sipariş bilgileri"
          : activeNav === "orders"
            ? "Canlı siparişler — gel-al, paket ve masa"
            : activeNav === "settings"
              ? "İşletme, hesap ve veri"
              : activeNav === "qr"
                ? "Menü bağlantısı, subdomain ve kod"
                : "Yakında";

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-on-background/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-x-hidden border-r border-surface-container-highest bg-surface-container-lowest pt-4 transition-[transform,width] duration-300 ease-in-out sm:pt-5 lg:translate-x-0 lg:pt-6",
          sidebarCollapsed ? "lg:w-20" : "lg:w-[280px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Mobil: her zaman tam genişlik + yazılar */}
        <div className="flex items-center justify-between gap-2 border-b border-surface-container-highest px-4 pb-4 pt-1 lg:hidden">
          <SidebarBrandRotator tenant={tenant} mode="mobile" />
          <button
            type="button"
            className="rounded-lg p-2 text-secondary hover:bg-surface-container-low"
            aria-label="Menüyü kapat"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Masaüstü: dar / geniş */}
        <div className="hidden border-b border-surface-container-highest lg:block">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 px-2 pb-5 pt-1">
              <SidebarBrandRotator tenant={tenant} mode="iconOnly" />
              <button
                type="button"
                className="group rounded-lg p-2 text-secondary transition-colors duration-200 hover:bg-surface-container-low active:bg-surface-container-high/80"
                aria-label="Menüyü genişlet"
                onClick={() => setCollapsedPersist(false)}
              >
                <span className="material-symbols-outlined text-[22px] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-110 group-active:scale-95 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:translate-x-0">
                  chevron_right
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-4 pb-5 pt-1">
              <SidebarBrandRotator tenant={tenant} mode="expanded" />
              <button
                type="button"
                className="rounded-lg p-2 text-secondary hover:bg-surface-container-low"
                aria-label="Menüyü daralt"
                onClick={() => setCollapsedPersist(true)}
              >
                <span className="material-symbols-outlined text-[22px]">chevron_left</span>
              </button>
            </div>
          )}
        </div>

        <nav
          className={`flex min-h-0 flex-1 flex-col overflow-x-hidden pb-3 pt-5 ${sidebarCollapsed ? "px-3 lg:px-1.5 lg:pt-6" : "px-3"}`}
          aria-label="Panel menüsü"
        >
          <div className="min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto pb-2">
            {NAV_MAIN.map((item) => (
              <SidebarNavButton
                key={item.id}
                item={item}
                active={activeNav === item.id}
                railMode={sidebarCollapsed}
                alertActive={item.id === "orders" && pendingOrderAlert}
                onSelect={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </div>

          <div className="mt-auto shrink-0 space-y-1.5 overflow-x-hidden border-t border-surface-container-high pt-4">
            <SidebarNavButton
              item={NAV_SETTINGS}
              active={activeNav === NAV_SETTINGS.id}
              railMode={sidebarCollapsed}
              onSelect={() => {
                setActiveNav(NAV_SETTINGS.id);
                setSidebarOpen(false);
              }}
            />
          </div>
        </nav>

        <div
          className={`border-t border-surface-container-high px-3 py-3 ${sidebarCollapsed ? "lg:px-1.5 lg:py-2.5" : ""}`}
        >
          <p
            className={`mb-1 text-[10px] font-semibold uppercase tracking-wider text-secondary ${sidebarCollapsed ? "lg:sr-only" : ""}`}
          >
            Bağlantılar
          </p>
          <ul
            className={[
              "flex flex-wrap items-center gap-1",
              sidebarCollapsed ? "lg:justify-center" : "",
            ].join(" ")}
            aria-label="Hızlı bağlantılar"
          >
            {quickLinks.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  target={link.href.startsWith("/") ? undefined : "_blank"}
                  rel={link.href.startsWith("/") ? undefined : "noopener noreferrer"}
                  title={link.hint ? `${link.label} — ${link.hint}` : link.label}
                  aria-label={link.hint ? `${link.label}, ${link.hint}` : link.label}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.06] text-primary shadow-sm transition-[border-color,background-color,transform] duration-200 hover:border-primary/40 hover:bg-primary/[0.11] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden>
                    {link.icon}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p
            className={`mt-1.5 text-center text-[9px] leading-tight text-secondary ${sidebarCollapsed ? "lg:hidden" : ""}`}
          >
            İkonun üzerine gelin; menü ve personel panelleri.
          </p>
        </div>
      </aside>

      <div
        className={[
          "transition-[padding] duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-[280px]",
        ].join(" ")}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-container-highest bg-surface-container-lowest/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-on-background hover:bg-surface-container-low lg:hidden"
            aria-label="Menüyü aç"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-[26px]">menu</span>
          </button>

          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="font-headline text-sm font-bold text-on-background sm:text-base">{headerTitle}</p>
            <p className="truncate text-xs text-secondary">{headerSubtitle}</p>
          </div>

          <div className="flex flex-1 items-center gap-2 sm:max-w-md sm:flex-initial">
            <label className="relative flex-1">
              <span className="sr-only">Ara</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </span>
              <input
                type="search"
                placeholder="Sipariş, ürün veya masa ara…"
                className="w-full rounded-xl border border-surface-container-highest bg-surface-container-low py-2 pl-10 pr-3 text-sm text-on-background placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                readOnly
                title="Yakında"
              />
            </label>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <DashboardNotificationsBell
              enabled={remoteAuthEnabled}
              connected={connected}
              toasts={toasts}
              dismissToast={dismissToast}
              formatToastTitle={formatToastTitle}
              formatActivityLogSummary={formatActivityLogSummary}
              activityLogs={activityLogs}
              setActivityLogs={setActivityLogs}
            />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white sm:h-10 sm:w-10"
              title={tenant.ownerName}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low sm:inline-block"
            >
              Çıkış
            </button>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {activeNav === "menu" ? (
              <MenuManager subdomain={tenant.subdomain} businessName={tenant.businessName} />
            ) : activeNav === "orders" ? (
              <DashboardOrdersList
                remoteAuthEnabled={remoteAuthEnabled}
                businessName={tenant.businessName}
                subdomain={tenant.subdomain}
                refreshKey={ordersRefreshKey}
              />
            ) : activeNav === "customers" ? (
              <CustomersManager subdomain={tenant.subdomain} />
            ) : activeNav === "qr" ? (
              <DashboardQrSubdomain tenant={tenant} />
            ) : activeNav === "reports" ? (
              <DashboardReports subdomain={tenant.subdomain} />
            ) : activeNav === "marketplace" ? (
              <MarketplaceSettingsPanel
                tenant={tenant}
                productCount={menuProductCount}
                onTenantUpdate={setTenant}
                persistSettingsToSupabase={remoteAuthEnabled}
                onNavigateToTab={(tab) => {
                  setActiveNav(tab);
                  setSidebarOpen(false);
                }}
              />
            ) : activeNav === "settings" ? (
              <DashboardSettings
                tenant={tenant}
                onTenantUpdate={setTenant}
                onMenuCleared={() => {
                  if (remoteAuthEnabled) {
                    void fetchDashboardMenuProductCount().then((count) => setMenuProductCount(count));
                  } else {
                    setMenuProductCount(0);
                  }
                }}
                onSignOut={handleSignOut}
                persistSettingsToSupabase={remoteAuthEnabled}
              />
            ) : activeNav !== "overview" ? (
              <DashboardPlaceholder navId={activeNav} />
            ) : (
              <>
            <div className="mb-8">
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">
                Hoş geldiniz, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">
                <span className="font-semibold text-on-background">{tenant.businessName}</span> için yönetim paneli.
                Menü yönetimi burada devam eder; detaylı sipariş ve merkezi raporlar için Admin alanını
                kullanabilirsiniz.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Bugünkü sipariş",
                  value: overviewLoading ? "…" : String(todayOrderCount),
                  hint: reportDayConfig?.hoursDayMode === "shift" ? "İş günü" : "Takvim günü",
                  icon: "shopping_bag",
                },
                {
                  label: "Aktif masa",
                  value: overviewLoading ? "…" : String(activeTableCount),
                  hint: tenant.dineInEnabled ? "Açık oturum" : "Masa kapalı",
                  icon: "table_restaurant",
                },
                {
                  label: "Menü ürünü",
                  value: String(menuProductCount),
                  hint: "Kayıtlı ürün",
                  icon: "fastfood",
                },
                {
                  label: "Müşteri",
                  value: String(customerCount),
                  hint: "Kayıtlı / sipariş veren",
                  icon: "group",
                },
              ].map((card) => (
                <section
                  key={card.label}
                  className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{card.label}</p>
                    <span className="material-symbols-outlined text-[22px] text-primary/80" aria-hidden>
                      {card.icon}
                    </span>
                  </div>
                  <p className="mt-3 font-headline text-3xl font-extrabold text-on-background">{card.value}</p>
                  <p className="mt-1 text-xs text-secondary">{card.hint}</p>
                </section>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-5">
              <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-headline text-lg font-bold text-on-background">Satış özeti</h2>
                    <p className="mt-1 text-xs text-secondary">
                      {salesSummary.orderCount} sipariş · {formatTry(salesSummary.revenueTotal)}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-secondary">
                    Son 7 gün
                  </span>
                </div>
                {salesSummary.byDay.length === 0 ? (
                  <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-outline/35 bg-surface-container-low/60">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl text-secondary/50">show_chart</span>
                      <p className="mt-2 text-sm font-medium text-secondary">
                        {overviewLoading ? "Yükleniyor…" : "Bu aralıkta satış yok."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-2">
                    {salesSummary.byDay.map((row) => {
                      const pct = maxDayRevenue > 0 ? Math.min(100, (row.revenue / maxDayRevenue) * 100) : 0;
                      return (
                        <div key={row.dayKey} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs font-medium text-secondary sm:w-32">
                            {row.label}
                          </span>
                          <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-container-high">
                            <div
                              className="h-full min-w-[4px] rounded-lg bg-gradient-to-r from-primary/80 to-primary-container/90"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-28 shrink-0 text-right text-xs">
                            <span className="font-semibold text-on-background">{formatTry(row.revenue)}</span>
                            <span className="ml-1 text-secondary">({row.orderCount})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
                <h2 className="font-headline text-lg font-bold text-on-background">Son aktiviteler</h2>
                {overviewLogs.length === 0 ? (
                  <p className="mt-6 text-sm text-secondary">
                    {overviewLoading ? "Yükleniyor…" : "Henüz aktivite kaydı yok."}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {overviewLogs.slice(0, 6).map((log) => (
                      <li
                        key={log.id}
                        className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container-low/80 px-3 py-3"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-secondary">
                          <span className="material-symbols-outlined text-[20px]">{activityIcon(log.action)}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-background">
                            {ACTIVITY_ACTION_LABELS[log.action] ?? log.action}
                          </p>
                          <p className="truncate text-xs text-secondary">{formatLogSummary(log)}</p>
                          <p className="mt-0.5 text-[10px] text-secondary/80">
                            {ACTIVITY_ACTOR_LABELS[log.actor_type] ?? log.actor_type} ·{" "}
                            {new Date(log.created_at).toLocaleString("tr-TR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="mt-8 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-headline text-lg font-bold text-on-background">Menü vitrin önizlemesi</h2>
                  <p className="mt-1 text-sm text-secondary">Menüdeki görünür ürünlerden seçki.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNav("menu")}
                  className="text-sm font-semibold text-primary hover:text-primary-container"
                >
                  Menüyü düzenle
                </button>
              </div>
              {menuPreview.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/50 px-5 py-10 text-center text-sm text-secondary">
                  {overviewLoading ? "Yükleniyor…" : "Henüz görünür ürün yok. Menü sekmesinden ekleyin."}
                </p>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {menuPreview.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-low"
                    >
                      <div className="aspect-[4/3] bg-surface-container">
                        {p.imageDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-secondary/40">
                            <span className="material-symbols-outlined text-4xl">restaurant</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-headline text-sm font-bold text-on-background">{p.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-secondary">
                          {p.description || "Açıklama yok"}
                        </p>
                        <p className="mt-2 text-sm font-black text-primary">
                          {formatTry(p.usePackagePrice ? p.packagePrice : p.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-high px-6 py-4">
                <h2 className="font-headline text-lg font-bold text-on-background">Son siparişler</h2>
                <button
                  type="button"
                  onClick={() => setActiveNav("orders")}
                  className="text-sm font-semibold text-primary hover:text-primary-container"
                >
                  Tümünü gör
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-container-high bg-surface-container-low/50 text-xs font-semibold uppercase tracking-wider text-secondary">
                      <th className="px-6 py-3">Sipariş</th>
                      <th className="px-6 py-3">Kanal</th>
                      <th className="px-6 py-3">Durum</th>
                      <th className="px-6 py-3 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-secondary">
                          {overviewLoading ? "Yükleniyor…" : "Henüz sipariş yok."}
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="bg-white/50">
                          <td className="px-6 py-3 font-medium text-on-background">
                            <span className="font-mono">{order.orderCode}</span>
                            <span className="mt-0.5 block text-xs font-normal text-secondary">
                              {order.firstName} {order.lastName}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-secondary">{orderChannelLabel(order)}</td>
                          <td className="px-6 py-3">
                            <span className="inline-flex rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs font-medium text-secondary">
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-on-background">
                            {formatTry(order.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
                <h2 className="font-headline text-sm font-bold uppercase tracking-wider text-secondary">
                  İletişim
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-secondary">E-posta</dt>
                    <dd className="mt-0.5 font-medium text-on-background">{tenant.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-secondary">Telefon</dt>
                    <dd className="mt-0.5 font-medium text-on-background">{tenant.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-secondary">Kayıt (yerel)</dt>
                    <dd className="mt-0.5 font-medium text-on-background">
                      {registered.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-dashed border-outline/40 bg-surface-container-low/40 p-6 text-center">
                <p className="text-sm text-secondary">
                  Menünüz canlıda{" "}
                  <span className="font-medium text-on-background">{tenant.subdomain}.kendisepetim.com</span>{" "}
                  adresinde. QR kodu indirmek için soldaki QR sekmesine geçin; menüyü Menü bölümünden düzenleyin.
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low sm:hidden"
                >
                  Çıkış yap
                </button>
              </div>
            </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
