"use client";

import { useCallback, useMemo, useState } from "react";

type NavKey = "overview" | "orders" | "categories" | "products" | "settings";

const NAV: { key: NavKey; label: string; emoji: string }[] = [
  { key: "overview", label: "Overview", emoji: "\u{1F4CA}" },
  { key: "orders", label: "Orders", emoji: "\u{1F9FE}" },
  { key: "categories", label: "Categories", emoji: "\u{1F5C2}\uFE0F" },
  { key: "products", label: "Products", emoji: "\u{1F3F7}\uFE0F" },
  { key: "settings", label: "Settings", emoji: "\u2699\uFE0F" },
];

const TITLES: Record<NavKey, string> = {
  overview: "Genel bakis",
  orders: "Siparisler",
  categories: "Kategoriler",
  products: "Urunler",
  settings: "Ayarlar",
};

const DIP_NOTES: Record<NavKey, string> = {
  overview: "Bugun 24 siparis · Ciro 4.280 TL · Ort. sepet 178 TL",
  orders: "Bekleyen 3 · Hazirlaniyor 5 · Bugun 18 tamamlandi",
  categories: "6 aktif kategori · Son duzenleme 2 gun once",
  products: "48 aktif urun · 12 dusuk stok (demo veri)",
  settings: "Restoran profili, tema ve bildirim tercihleri",
};

const DEMO_CARDS: Record<
  NavKey,
  { title: string; sub: string; c: string }[]
> = {
  overview: [
    { title: "Siparis ozeti", sub: "Son 24 saat", c: "bg-orange-500" },
    { title: "Musteri menusu", sub: "Canli link", c: "bg-emerald-600" },
    { title: "Hizli ayar", sub: "Teslimat ucreti", c: "bg-sky-600" },
  ],
  orders: [
    { title: "Bekleyen", sub: "3 siparis", c: "bg-amber-600" },
    { title: "Mutfak", sub: "5 aktif", c: "bg-orange-600" },
    { title: "Tamamlanan", sub: "18 bugun", c: "bg-emerald-700" },
  ],
  categories: [
    { title: "Icecekler", sub: "12 urun", c: "bg-cyan-600" },
    { title: "Ana yemek", sub: "22 urun", c: "bg-violet-600" },
    { title: "Tatli", sub: "6 urun", c: "bg-pink-600" },
  ],
  products: [
    { title: "Yeni ekle", sub: "Form ac", c: "bg-sky-600" },
    { title: "Toplu fiyat", sub: "Yakinda", c: "bg-slate-500" },
    { title: "Stok uyari", sub: "12 urun", c: "bg-red-500" },
  ],
  settings: [
    { title: "Restoran adi", sub: "Durumcu Ekrem Demo", c: "bg-gray-700" },
    { title: "Tema rengi", sub: "#111827", c: "bg-gray-900" },
    { title: "Bildirimler", sub: "E-posta acik", c: "bg-indigo-600" },
  ],
};

const MONTHS_TR = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

const DAYS_TR = [
  "Pazar",
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
];

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

export function PreviewVariant7() {
  const [nav, setNav] = useState<NavKey>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(2026, 2, 28));
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateInput, setDateInput] = useState(() => toYmd(new Date(2026, 2, 28)));

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

  return (
    <div className="relative isolate min-h-[560px] border-t border-gray-100 bg-white">
      {/* Mobil drawer + modal bu kutu icinde kalir (sayfa tamamini kaplamaz) */}
      {mobileOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-40 bg-black/30 md:hidden"
          aria-label="Menuyu kapat"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="relative flex min-h-[560px] flex-col md:flex-row">
      <aside
        className={`absolute left-0 top-0 z-50 flex h-full w-[260px] max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:static md:z-0 md:h-auto md:min-h-[560px] md:max-w-none md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${desktopCollapsed ? "md:w-[72px]" : "md:w-[240px]"}`}
      >
        <div className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] font-medium text-gray-400"
              title="Logo alani (yukleme + logomaker sonra)"
            >
              Logo
            </div>
            {!desktopCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900">KendiSepetim</p>
                <p className="truncate text-[11px] text-gray-500">Durumcu Ekrem Demo</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setDesktopCollapsed((c) => !c)}
              className="hidden rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 md:inline"
              title="Menüyü daralt / ac"
            >
              {desktopCollapsed ? "»" : "«"}
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setNav(item.key);
                  setMobileOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2"
                    : "text-gray-600 hover:bg-gray-50"
                } ${desktopCollapsed ? "justify-center md:px-2" : ""}`}
                title={desktopCollapsed ? item.label : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.emoji}
                </span>
                {!desktopCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 p-3">
          {!desktopCollapsed ? (
            <>
              <p className="text-xs font-semibold text-gray-900">Demo Restoran</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">kendisepetimtr@gmail.com</p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cikis Yap
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg"
              title="Cikis"
              aria-label="Cikis"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-gray-50/90 md:min-h-[560px]">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          >
            Menu
          </button>
          <span className="text-xs text-gray-500">Akordiyon / drawer onizleme</span>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div className="border-b border-gray-200/90 pb-5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => shiftDay(-1)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                aria-label="Onceki gun"
              >
                ◀
              </button>
              <p className="text-sm tracking-wide text-gray-400">{dateLine}</p>
              <button
                type="button"
                onClick={() => shiftDay(1)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                aria-label="Sonraki gun"
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
                title="Tarih sec"
                aria-label="Tarih sec"
              >
                🔍
              </button>
            </div>
            <h2 className="mt-4 text-3xl font-light tracking-tight text-gray-900 sm:text-4xl">
              {TITLES[nav]}
            </h2>
            <p className="mt-2 text-sm text-gray-500">{DIP_NOTES[nav]}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_CARDS[nav].map((card) => (
              <div
                key={card.title}
                className={`flex min-h-[100px] flex-col justify-between rounded-2xl ${card.c} p-4 text-white shadow-md`}
              >
                <span className="font-semibold">{card.title}</span>
                <span className="text-xs opacity-90">{card.sub}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Varyant 7: menüye tiklayarak baslik ve dip not degisimini deneyin. Masaustunde « ile
            sutunu daraltin; mobilde Menu ile drawer acin.
          </p>
        </div>
      </div>
      </div>

      {dateModalOpen ? (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDateModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v7-date-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="v7-date-modal-title" className="text-sm font-semibold text-gray-900">
              Tarih sec (onizleme)
            </h3>
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
                Iptal
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
