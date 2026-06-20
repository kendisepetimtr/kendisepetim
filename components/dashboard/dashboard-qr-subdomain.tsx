"use client";

import QrCodeWithLogoPreview from "@/components/dashboard/qr-code-with-logo-preview";
import { createQrPngWithCenterLogo, defaultKendiSepetimLogoUrl, qrCodeApiUrl } from "@/lib/qr-with-logo";
import { getPublicMenuConnectionLinks, getPublicMenuPathUrl, type PublicMenuConnectionLink } from "@/lib/public-menu-urls";
import type { LocalTenantProfile } from "@/lib/local-tenant";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type DashboardQrSubdomainProps = {
  tenant: LocalTenantProfile;
};

export default function DashboardQrSubdomain({ tenant }: DashboardQrSubdomainProps) {
  const baseId = useId();
  const [links, setLinks] = useState<PublicMenuConnectionLink[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    setLinks(getPublicMenuConnectionLinks(tenant.subdomain));
  }, [tenant.subdomain]);

  useEffect(() => {
    if (!links.length) return;
    if (!selectedKey || !links.some((l) => l.key === selectedKey)) {
      const preferred =
        links.find((l) => l.key === "live-menu-path-prod")?.key ?? links[0]!.key;
      setSelectedKey(preferred);
    }
  }, [links, selectedKey]);

  const selected = useMemo(
    () => links.find((l) => l.key === selectedKey) ?? links[0] ?? null,
    [links, selectedKey],
  );

  const prodUrl = useMemo(
    () => `https://${tenant.subdomain}.kendisepetim.com`,
    [tenant.subdomain],
  );

  const prodPathUrl = useMemo(
    () => getPublicMenuPathUrl(tenant.subdomain),
    [tenant.subdomain],
  );

  const flashCopy = useCallback((id: string) => {
    setCopyFlash(id);
    window.setTimeout(() => setCopyFlash(null), 1600);
  }, []);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      flashCopy(label);
    } catch {
      window.alert("Kopyalanamadı; metni elle seçin.");
    }
  }

  async function handleDownloadPng() {
    if (!selected) return;
    const logoSrc = tenant.logoDataUrl.trim() ? tenant.logoDataUrl : defaultKendiSepetimLogoUrl();
    const fallbackSrc = qrCodeApiUrl(selected.href, 320);
    setDownloadBusy(true);
    try {
      const composite = await createQrPngWithCenterLogo(selected.href, 320, logoSrc);
      if (composite) {
        const res = await fetch(composite);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kendisepetim-qr-${tenant.subdomain}-${selected.key}.png`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const res = await fetch(fallbackSrc);
      if (!res.ok) throw new Error("fetch");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kendisepetim-qr-${tenant.subdomain}-${selected.key}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(fallbackSrc, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-background sm:text-3xl">QR</h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          Müşteri menü adresi ve yazdırılabilir kod. Ortada{" "}
          {tenant.logoDataUrl.trim() ? "işletme logonuz" : "KendiSepetim logosu"} yer alır (Ayarlar’dan logo
          ekleyebilirsiniz). Yerel önizleme bağlantıları yalnızca bu cihazda çalışır; canlıda{" "}
          <span className="font-mono text-on-background/90">{prodUrl}</span> kullanılır.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">Subdomain</h2>
          <p className="mt-1 text-sm text-secondary">
            İşletmenize ayrılmış alt alan adı. Ayarlardan değiştirilemez; canlı yayında DNS ile bu ada yönlendirme
            yapılır.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2 font-mono text-base font-bold text-on-background">
              {tenant.subdomain}
            </code>
            <button
              type="button"
              onClick={() => copyText("sub", tenant.subdomain)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-on-background hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              {copyFlash === "sub" ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
          <p className="mt-3 break-all text-sm text-secondary">
            Canlı menü:{" "}
            <a
              href={prodUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-medium text-primary hover:text-primary-container"
            >
              {prodUrl}
            </a>
          </p>
          <p className="mt-2 break-all text-sm text-secondary">
            Yedek menü:{" "}
            <a
              href={prodPathUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-medium text-primary hover:text-primary-container"
            >
              {prodPathUrl.replace(/^https:\/\//, "")}
            </a>
          </p>
        </section>

        <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-on-background">QR kod</h2>
          <p className="mt-1 text-sm text-secondary">
            Hangi adres için kod üretileceğini seçin. QR yüksek düzeltme (ECC-H) ile üretilir; orta logo tarama için
            güvenli pay bırakır.
          </p>

          {selected ? (
            <>
              <div className="mt-4">
                <label className="block text-xs font-medium text-secondary" htmlFor={`${baseId}-qr-target`}>
                  Menü adresi
                </label>
                <select
                  id={`${baseId}-qr-target`}
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-xl border border-surface-container-highest bg-white px-3 py-2.5 text-sm text-on-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {links.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.hint ? `${l.hint} — ${l.label}` : l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex flex-col items-center rounded-2xl border border-surface-container-high bg-white p-6 sm:flex-row sm:items-start sm:gap-8">
                <QrCodeWithLogoPreview menuUrl={selected.href} tenantLogoDataUrl={tenant.logoDataUrl} displaySize={240} />
                <div className="mt-5 min-w-0 flex-1 sm:mt-0">
                  <p className="break-all font-mono text-xs leading-relaxed text-on-background">{selected.href}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={selected.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-container"
                    >
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                      Menüyü aç
                    </a>
                    <button
                      type="button"
                      onClick={() => copyText("url", selected.href)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-[20px]">link</span>
                      {copyFlash === "url" ? "Kopyalandı" : "Adresi kopyala"}
                    </button>
                    <button
                      type="button"
                      disabled={downloadBusy}
                      onClick={() => void handleDownloadPng()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[20px]">download</span>
                      {downloadBusy ? "İndiriliyor…" : "PNG indir"}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-secondary">
                    Kod gövdesi api.qrserver.com ile üretilir; logo yüksek çözünürlükte birleştirilip indirmede net
                    ölçeklenir. Yine de çok küçük logo dosyaları büyütülürken yumuşar — mümkünse en az ~200px kare
                    görsel yükleyin. CORS kısıtı olursa yalnızca düz QR gösterilir.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-secondary">Bağlantı listesi yükleniyor…</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
        <h2 className="font-headline text-lg font-bold text-on-background">Tüm menü bağlantıları</h2>
        <p className="mt-1 text-sm text-secondary">
          Panodaki «Bağlantılar» ile aynı adresler. Subdomain DNS hazır değilse yedek path adresini kullanın;
          yerel geliştirmede localhost adresleri yalnızca bu cihazda çalışır.
        </p>
        <ul className="mt-4 space-y-3">
          {links.map((l) => (
            <li
              key={l.key}
              className="flex flex-col gap-2 rounded-xl border border-surface-container-high bg-surface-container-low/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden>
                    {l.icon}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="font-headline text-sm font-bold text-on-background">{l.hint ?? l.label}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-secondary">{l.href}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(l.key, l.href)}
                  className="rounded-lg border border-surface-container-highest bg-white px-3 py-1.5 text-xs font-semibold text-on-background hover:bg-surface-container-low"
                >
                  {copyFlash === l.key ? "Kopyalandı" : "Kopyala"}
                </button>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-container"
                >
                  Aç
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
