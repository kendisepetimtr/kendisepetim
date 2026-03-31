"use client";

import { useMemo, useState } from "react";

type Mode = "table" | "package";

const SAMPLE_PRODUCTS = [
  { id: "1", name: "Adana Dürüm", price: 220, desc: "Acılı, lavaş, köz biber", cat: "Dürümler" },
  { id: "2", name: "Urfa Dürüm", price: 210, desc: "Acısız, lavaş, sumaklı soğan", cat: "Dürümler" },
  { id: "3", name: "Ayran", price: 30, desc: "300 ml", cat: "İçecekler" },
  { id: "4", name: "Şalgam", price: 35, desc: "Acılı", cat: "İçecekler" },
  { id: "5", name: "Künefe", price: 120, desc: "Sıcak servis", cat: "Tatlılar" },
  { id: "6", name: "Sütlaç", price: 95, desc: "Fırın sütlaç", cat: "Tatlılar" },
];

function formatTry(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);
}

export function PreviewPosCashier() {
  const [mode, setMode] = useState<Mode>("table");
  const [tableNo, setTableNo] = useState("4");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [showCustomerStep, setShowCustomerStep] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, typeof SAMPLE_PRODUCTS> = {};
    for (const p of SAMPLE_PRODUCTS) {
      if (!map[p.cat]) map[p.cat] = [];
      map[p.cat].push(p);
    }
    return map;
  }, []);

  const totalItems = useMemo(() => Object.values(qty).reduce((s, n) => s + n, 0), [qty]);
  const subtotal = useMemo(
    () =>
      SAMPLE_PRODUCTS.reduce((s, p) => {
        const q = qty[p.id] ?? 0;
        return s + q * p.price;
      }, 0),
    [qty],
  );

  const selected = SAMPLE_PRODUCTS.filter((p) => (qty[p.id] ?? 0) > 0);

  function changeQty(id: string, next: number) {
    setQty((prev) => {
      const n = { ...prev };
      if (next <= 0) delete n[id];
      else n[id] = next;
      return n;
    });
  }

  return (
    <div className="min-h-[760px] bg-slate-100 p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Kasa Modu (Tam Ekran Önizleme)</p>
            <p className="text-xs text-slate-300">Sidebar ve dashboard üst bar gizli, sadece sipariş odaklı alan</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("table");
                setShowCustomerStep(false);
              }}
              className={`rounded-md px-3 py-1.5 ${mode === "table" ? "bg-white text-slate-900" : "text-slate-200"}`}
            >
              Masa Siparişi
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("package");
              }}
              className={`rounded-md px-3 py-1.5 ${mode === "package" ? "bg-white text-slate-900" : "text-slate-200"}`}
            >
              Paket Siparişi
            </button>
          </div>
        </div>

        <div className="grid min-h-[680px] grid-cols-1 xl:grid-cols-[1fr_360px]">
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {mode === "table" ? `Masa ${tableNo} · Sipariş Al` : "Paket Siparişi · Sipariş Al"}
                </h3>
                <p className="text-sm text-slate-500">Ürün seçimi (garson ekranı ile aynı deneyim)</p>
              </div>
              {mode === "table" ? (
                <select
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>
                      Masa {n}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="space-y-5">
              {Object.entries(grouped).map(([cat, items]) => (
                <section key={cat}>
                  <h4 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700">{cat}</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {items.map((p) => {
                      const n = qty[p.id] ?? 0;
                      return (
                        <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{p.desc}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900">{formatTry(p.price)}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeQty(p.id, n - 1)}
                                className="h-8 w-8 rounded-md border border-slate-300 text-base"
                              >
                                −
                              </button>
                              <span className="min-w-[2ch] text-center text-sm font-medium">{n}</span>
                              <button
                                type="button"
                                onClick={() => changeQty(p.id, n + 1)}
                                className="h-8 w-8 rounded-md border border-slate-300 text-base"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-4 xl:border-l xl:border-t-0">
            <h4 className="text-sm font-semibold text-slate-800">Sipariş Özeti</h4>
            <p className="mt-1 text-xs text-slate-500">Desktop POS sağ panel</p>

            <div className="mt-3 max-h-[260px] space-y-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
              {selected.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">Henüz ürün yok</p>
              ) : (
                selected.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5">
                    <span className="text-sm text-slate-700">
                      {qty[p.id]}x {p.name}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{formatTry((qty[p.id] ?? 0) * p.price)}</span>
                  </div>
                ))
              )}
            </div>

            {mode === "package" && showCustomerStep ? (
              <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-900">Müşteri bilgisi (2. adım)</p>
                <input placeholder="Ad soyad" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Telefon" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Adres (opsiyonel)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            ) : null}

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Toplam kalem</span>
                <strong className="text-slate-900">{totalItems}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">Ara toplam</span>
                <strong className="text-slate-900">{formatTry(subtotal)}</strong>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {mode === "package" ? (
                <button
                  type="button"
                  onClick={() => setShowCustomerStep((v) => !v)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {showCustomerStep ? "Ürün adımına dön" : "Müşteri adımına geç"}
                </button>
              ) : null}
              <button type="button" className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                Siparişi Tamamla
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
