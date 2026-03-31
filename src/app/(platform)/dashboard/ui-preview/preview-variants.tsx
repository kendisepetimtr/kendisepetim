import Link from "next/link";
import { PreviewVariant7 } from "./preview-variant7";
import { PreviewPosCashier } from "./preview-pos-cashier";

const SAMPLE_ORDERS = [
  { id: "#1042", time: "14:32", total: "186 TL", status: "Hazirlaniyor" },
  { id: "#1041", time: "14:18", total: "94 TL", status: "Onaylandi" },
  { id: "#1040", time: "13:55", total: "420 TL", status: "Teslim" },
];

function VariantLabel({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="border-b border-dashed border-gray-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
      <span className="font-bold">Varyant {n}:</span> {title}
      <span className="text-amber-800"> — {desc}</span>
    </div>
  );
}

export function DashboardPreviewVariants() {
  return (
    <div className="space-y-10 pb-20">
      <div className="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard UI onizleme</h1>
        <p className="text-xs text-gray-600">
          Sadece gelistirme. Canli dashboard su an Varyant 7 kabugunu kullaniyor; asagidakiler karsilastirma
          icin duruyor.
        </p>
        <nav className="mt-2 flex flex-wrap gap-2 text-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <a
              key={i}
              href={`#v${i}`}
              className="rounded-md bg-white px-2 py-1 font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              V{i}
            </a>
          ))}
          <Link href="/dashboard" className="rounded-md px-2 py-1 text-gray-600 underline">
            Overview don
          </Link>
        </nav>
      </div>

      {/* 1 — SaaS klasik */}
      <section id="v1" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={1}
          title="SaaS klasik"
          desc="Ust KPI satiri, sol siparis listesi, sag hizli aksiyon + menu CTA."
        />
        <div className="p-5">
          <h2 className="text-xl font-semibold text-gray-900">Genel bakis</h2>
          <p className="text-sm text-gray-500">Bugunun ozeti</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { k: "Bugun siparis", v: "24" },
              { k: "Ciro", v: "4.280 TL" },
              { k: "Bekleyen", v: "3" },
              { k: "Ort. sepet", v: "178 TL" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">{x.k}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{x.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium text-gray-900">Son siparisler</h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-2">No</th>
                    <th className="pb-2">Saat</th>
                    <th className="pb-2">Tutar</th>
                    <th className="pb-2">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ORDERS.map((o) => (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{o.id}</td>
                      <td className="py-2 text-gray-600">{o.time}</td>
                      <td className="py-2">{o.total}</td>
                      <td className="py-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-900">Musteri menusu</p>
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white"
                >
                  Menuyu ac (ornek)
                </button>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-700">Hizli erisim</p>
                <ul className="mt-2 space-y-1 text-sm text-indigo-600">
                  <li>
                    <span className="cursor-default hover:underline">Kategoriler</span>
                  </li>
                  <li>
                    <span className="cursor-default hover:underline">Urunler</span>
                  </li>
                  <li>
                    <span className="cursor-default hover:underline">Ayarlar</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Kart / operasyon */}
      <section id="v2" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={2}
          title="Kart / operasyon"
          desc="Buyuk dokunma alanlari, kasa veya tablet hissi."
        />
        <div className="bg-gradient-to-b from-slate-50 to-white p-5">
          <h2 className="text-center text-2xl font-bold text-gray-900">Bugun</h2>
          <p className="text-center text-sm text-gray-500">Hizli secim</p>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { t: "Siparisler", sub: "12 acik", c: "bg-orange-500" },
              { t: "Menü", sub: "Musteri sayfasi", c: "bg-emerald-600" },
              { t: "Urunler", sub: "Duzenle", c: "bg-sky-600" },
              { t: "Kategoriler", sub: "Duzenle", c: "bg-violet-600" },
              { t: "Ayarlar", sub: "Restoran", c: "bg-gray-700" },
              { t: "Rapor", sub: "Yakinda", c: "bg-slate-400" },
            ].map((x) => (
              <button
                key={x.t}
                type="button"
                className={`flex min-h-[110px] flex-col items-center justify-center rounded-2xl ${x.c} px-4 py-5 text-center text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]`}
              >
                <span className="text-lg font-semibold">{x.t}</span>
                <span className="mt-1 text-xs opacity-90">{x.sub}</span>
              </button>
            ))}
          </div>
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-600">
            Altta ozet: <strong className="text-gray-900">3</strong> siparis hazirlaniyor
          </div>
        </div>
      </section>

      {/* 3 — Yogun veri */}
      <section id="v3" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={3}
          title="Yogun veri"
          desc="Kucuk tip, cok metrik, tablo agirligi."
        />
        <div className="p-4 text-[13px] leading-tight">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-gray-200 pb-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Operasyon</h2>
              <p className="text-gray-500">28 Mart 2026 · Cumartesi</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded bg-gray-100 px-2 py-1">Gun</span>
              <span className="rounded px-2 py-1 text-gray-500">Hafta</span>
              <span className="rounded px-2 py-1 text-gray-500">Ay</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              "Siparis 24",
              "Ciro 4.3k",
              "Ort 178",
              "Iptal %2",
              "Sure 12dk",
              "Masa 8",
            ].map((t) => (
              <div key={t} className="border border-gray-100 bg-gray-50 px-2 py-1.5">
                <span className="font-medium text-gray-900">{t}</span>
              </div>
            ))}
          </div>
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-[11px] uppercase text-gray-600">
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Tip</th>
                <th className="px-2 py-1">Musteri</th>
                <th className="px-2 py-1">Tutar</th>
                <th className="px-2 py-1">Durum</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1042", "Teslimat", "A.Y.", "186", "Hazirlik"],
                ["1041", "Masa 4", "—", "94", "Onay"],
                ["1040", "Gel-Al", "M.K.", "42", "Teslim"],
                ["1039", "Teslimat", "S.D.", "210", "Bekliyor"],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-gray-100 hover:bg-gray-50">
                  {row.map((cell) => (
                    <td key={cell} className="px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 — Sakin minimal */}
      <section id="v4" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={4}
          title="Sakin minimal"
          desc="Bosluk, tek odak, az renk."
        />
        <div className="px-8 py-16 sm:px-16">
          <p className="text-sm tracking-wide text-gray-400">Ozet</p>
          <p className="mt-2 text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">24</p>
          <p className="mt-1 text-sm text-gray-500">bugunku siparis</p>
          <div className="mx-auto mt-12 max-w-sm space-y-6 border-t border-gray-100 pt-12">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Musteri menusu</span>
              <span className="text-gray-400">→</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Siparisler</span>
              <span className="text-gray-400">→</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Menuyu duzenle</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Koyu tema */}
      <section id="v5" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-sm">
        <VariantLabel
          n={5}
          title="Koyu tema"
          desc="Dusuk parlaklik, mutfak / gece kullanimi."
        />
        <div className="p-5 text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Panel</h2>
              <p className="text-xs text-slate-400">Canli · 3 aktif siparis</p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Menuyu ac
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "Siparis", v: "24" },
              { l: "Ciro", v: "4.280" },
              { l: "Bekleyen", v: "3" },
              { l: "Hazir", v: "5" },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{x.l}</p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">{x.v}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {SAMPLE_ORDERS.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
              >
                <span className="font-mono text-slate-300">{o.id}</span>
                <span className="text-slate-500">{o.time}</span>
                <span className="text-emerald-400/90">{o.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6 — Hibrit (hedef tasarim) */}
      <section id="v6" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={6}
          title="Hibrit (hedef)"
          desc="Sol liste menusu (kart degil) + ustte sakin tarih + overview kartlari (operasyon)."
        />
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500">
          Ornek veri: <span className="font-medium text-gray-700">Durumcu Ekrem Demo</span> ·
          owner@ornek.com
        </div>
        <div className="flex min-h-[520px] flex-col md:flex-row">
          {/* Simule sol menu — gercek layouttaki aside ile ayni dil */}
          <aside className="flex w-full shrink-0 flex-col border-gray-200 bg-white md:w-[220px] md:border-r">
            <div className="hidden border-b border-gray-100 px-3 py-3 md:block">
              <p className="text-xs font-semibold text-gray-900">KendiSepetim</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">Durumcu Ekrem Demo</p>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:gap-0 md:p-2">
              {[
                { label: "Overview", active: true },
                { label: "Orders", active: false },
                { label: "Categories", active: false },
                { label: "Products", active: false },
                { label: "Settings", active: false },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm md:rounded-lg ${
                    item.active
                      ? "bg-gray-100 font-medium text-gray-900 md:border-l-2 md:border-gray-900 md:pl-2.5"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 bg-gray-50/80 p-4 sm:p-6">
            {/* Varyant 4 tarzi sakin ust serit */}
            <div className="border-b border-gray-200/80 pb-6">
              <p className="text-sm tracking-wide text-gray-400">28 Mart 2026 · Cumartesi</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-3xl font-light tracking-tight text-gray-900 sm:text-4xl">Genel bakis</h2>
                <p className="text-sm text-gray-500">
                  Bugun <span className="font-medium text-gray-800">24</span> siparis · Ciro{" "}
                  <span className="font-medium text-gray-800">4.280 TL</span>
                </p>
              </div>
            </div>

            {/* Varyant 2 tarzi operasyon kartlari — sadece main */}
            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Siparisler",
                  sub: "12 acik · 3 hazirlaniyor",
                  c: "bg-orange-500",
                  action: "Listeye git",
                },
                {
                  title: "Musteri menusu",
                  sub: "durumcu-ekrem.kendisepetim.com",
                  c: "bg-emerald-600",
                  action: "Menuyu ac",
                },
                {
                  title: "Urunler",
                  sub: "48 aktif urun",
                  c: "bg-sky-600",
                  action: "Duzenle",
                },
                {
                  title: "Kategoriler",
                  sub: "6 kategori",
                  c: "bg-violet-600",
                  action: "Duzenle",
                },
                {
                  title: "Ayarlar",
                  sub: "Restoran ve tema",
                  c: "bg-gray-700",
                  action: "Ac",
                },
                {
                  title: "Ozet rapor",
                  sub: "Yakinda",
                  c: "bg-slate-400",
                  action: "Bildir",
                },
              ].map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className={`flex min-h-[128px] flex-col items-start justify-between rounded-2xl ${card.c} p-4 text-left text-white shadow-md transition hover:brightness-110 active:scale-[0.99]`}
                >
                  <div>
                    <span className="text-lg font-semibold">{card.title}</span>
                    <p className="mt-1 text-xs opacity-90">{card.sub}</p>
                  </div>
                  <span className="text-xs font-medium underline decoration-white/60 underline-offset-2">
                    {card.action} →
                  </span>
                </button>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-4xl text-center text-xs text-gray-400">
              Bu blok /dashboard overview icin hedef; sol menu gercek uygulamada mevcut aside ile
              birlesir.
            </p>
          </div>
        </div>
      </section>

      {/* 7 — Hibrit etkilesimli (logo, emoji nav, drawer/daralt, tarih, dip not, alt kullanici) */}
      <section id="v7" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={7}
          title="Hibrit — etkilesimli onizleme"
          desc="Logo alani, emoji menuler, mobil drawer + masaustu daraltma, tarih oklari + modal, menuye gore baslik/dip not, alt cikis blogu."
        />
        <PreviewVariant7 />
      </section>

      {/* 8 — Kasa modu (tam ekran POS) */}
      <section id="v8" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <VariantLabel
          n={8}
          title="Kasa modu — tam ekran POS"
          desc="Masa/Paket toggle, sol urun alani + sag sabit ozet paneli, dashboard shell gizli varsayim."
        />
        <PreviewPosCashier />
      </section>
    </div>
  );
}
