"use client";

import CustomersManager from "@/components/dashboard/customers-manager";
import DashboardOrdersList from "@/components/dashboard/dashboard-orders-list";
import DashboardReports from "@/components/dashboard/dashboard-reports";
import DashboardQrSubdomain from "@/components/dashboard/dashboard-qr-subdomain";
import DashboardSettings from "@/components/dashboard/dashboard-settings";
import MarketplaceSettingsPanel from "@/components/dashboard/marketplace-settings-panel";
import MenuManager from "@/components/dashboard/menu-manager";
import type { SyncDashboardTenantResult } from "@/app/dashboard/tenant-sync-actions";
import SidebarBrandRotator from "@/components/dashboard/sidebar-brand-rotator";
import { clearLocalCustomers, countLocalCustomers } from "@/lib/local-customers";
import { clearLocalOrders } from "@/lib/local-orders";
import { clearPublicCheckoutMirror, writePublicCheckoutMirror } from "@/lib/public-checkout-mirror";
import { clearLocalTenant, getLocalTenant, saveLocalTenant, type LocalTenantProfile } from "@/lib/local-tenant";
import { mergeDashboardTenantProfiles } from "@/lib/tenant-client-sync";
import { getPublicMenuConnectionLinks } from "@/lib/public-menu-urls";
import { signOutFromDashboard } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
}: {
  item: SidebarNavItem;
  active: boolean;
  onSelect: () => void;
  /** Masaüstü dar sidebar: yalnızca ikon; etiket sr-only + title */
  railMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex w-full items-center gap-3 rounded-xl py-3 text-sm font-medium transition-[transform,color,background-color] duration-300 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0",
        railMode
          ? "max-lg:px-3 max-lg:text-left lg:justify-center lg:gap-0 lg:px-2 lg:hover:translate-x-0 lg:transition-[transform,color,background-color] lg:duration-200 lg:hover:bg-surface-container-low lg:active:bg-surface-container-high/80"
          : "justify-start px-3 text-left",
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
          active ? "text-primary" : "text-secondary",
          railMode
            ? "lg:group-hover:scale-110 lg:group-hover:-rotate-3 lg:group-active:scale-95 motion-reduce:lg:group-hover:scale-100 motion-reduce:lg:group-hover:rotate-0"
            : "",
        ].join(" ")}
        aria-hidden
      >
        {item.icon}
      </span>
      <span className={railMode ? "lg:sr-only" : ""}>{item.label}</span>
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

async function fetchDashboardTenantProfile(): Promise<SyncDashboardTenantResult> {
  try {
    const res = await fetch("/api/dashboard/tenant", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json()) as SyncDashboardTenantResult;
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
    setCustomerCount(countLocalCustomers(tenant.subdomain));
    if (remoteAuthEnabled) {
      void fetchDashboardMenuProductCount()
        .then((count) => setMenuProductCount(count))
        .catch(() => setMenuProductCount(0));
    } else {
      setMenuProductCount(0);
    }
  }, [tenant, activeNav, remoteAuthEnabled]);

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
        await signOutFromDashboard();
      } catch {
        /* sunucu oturumu kapanmazsa yine ana sayfaya yönlendir */
      }
    }
    router.push("/giris");
    router.refresh();
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

  /** Sidebar’daki bağlantı alanı — üretim + yerelde path / alt alan adı. */
  const sidebarConnectionLinks = getPublicMenuConnectionLinks(tenant.subdomain);
  const quickLinks = remoteAuthEnabled
    ? [
        ...sidebarConnectionLinks,
        {
          key: "admin-panel",
          href: "/dashboard/admin",
          label: "Admin",
          hint: "Sahip görünümü",
          icon: "admin_panel_settings",
        },
      ]
    : sidebarConnectionLinks;

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
            ? "Bu cihazda kayıtlı QR siparişleri"
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
            İkonun üzerine gelin; yerel önizleme oturumu.
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
            <button
              type="button"
              className="hidden rounded-xl p-2 text-secondary hover:bg-surface-container-low sm:inline-flex"
              aria-label="Bildirimler"
              title="Yakında"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
            </button>
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
              <DashboardOrdersList subdomain={tenant.subdomain} />
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
                { label: "Bugünkü sipariş", value: "—", hint: "Yakında", icon: "shopping_bag" },
                { label: "Aktif masa", value: "—", hint: "Canlı", icon: "table_restaurant" },
                {
                  label: "Menü ürünü",
                  value: String(menuProductCount),
                  hint: "Kayıtlı ürün",
                  icon: "fastfood",
                },
                {
                  label: "Müşteri",
                  value: String(customerCount),
                  hint: "Kayıtlı",
                  icon: "group",
                },
                { label: "Ort. hazırlık", value: "—", hint: "dk", icon: "timer" },
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-headline text-lg font-bold text-on-background">Satış özeti</h2>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-secondary">
                    Son 7 gün
                  </span>
                </div>
                <div
                  className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-outline/35 bg-gradient-to-br from-surface-container-low to-surface-container"
                  role="img"
                  aria-label="Grafik yer tutucu"
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-secondary/50">show_chart</span>
                    <p className="mt-2 text-sm font-medium text-secondary">Grafik alanı (placeholder)</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
                <h2 className="font-headline text-lg font-bold text-on-background">Son aktiviteler</h2>
                <ul className="mt-4 space-y-3">
                  {["Menü senkronu", "QR menü görüntüleme", "Yeni sipariş"].map((label, i) => (
                    <li
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container-low/80 px-3 py-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-secondary">
                        <span className="material-symbols-outlined text-[20px]">
                          {i === 0 ? "sync" : i === 1 ? "qr_code_scanner" : "receipt"}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-on-background">{label}</p>
                        <p className="text-xs text-secondary">Veri bağlantısı sonrası doldurulacak</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-8 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-headline text-lg font-bold text-on-background">Menü vitrin önizlemesi</h2>
                  <p className="mt-1 text-sm text-secondary">Ürün görselleri için yer tutucular — içerik sonra bağlanacak.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-low"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-surface-container to-surface-container-highest" />
                    <div className="p-4">
                      <p className="font-headline text-sm font-bold text-on-background">Ürün {n}</p>
                      <p className="mt-1 text-xs text-secondary">Açıklama placeholder</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-high px-6 py-4">
                <h2 className="font-headline text-lg font-bold text-on-background">Son siparişler</h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:text-primary-container"
                  title="Yakında"
                >
                  Tümünü gör
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-container-high bg-surface-container-low/50 text-xs font-semibold uppercase tracking-wider text-secondary">
                      <th className="px-6 py-3">Sipariş</th>
                      <th className="px-6 py-3">Masa</th>
                      <th className="px-6 py-3">Durum</th>
                      <th className="px-6 py-3 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {[
                      { id: "#1001", table: "M3", status: "Hazırlanıyor", amount: "—" },
                      { id: "#1002", table: "T2", status: "Serviste", amount: "—" },
                      { id: "#1003", table: "M1", status: "Ödendi", amount: "—" },
                    ].map((row) => (
                      <tr key={row.id} className="bg-white/50">
                        <td className="px-6 py-3 font-medium text-on-background">{row.id}</td>
                        <td className="px-6 py-3 text-secondary">{row.table}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs font-medium text-secondary">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-on-background">{row.amount}</td>
                      </tr>
                    ))}
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
