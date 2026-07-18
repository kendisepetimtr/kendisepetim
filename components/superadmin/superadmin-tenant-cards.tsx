"use client";

import {
  superadminSetMarketplace,
  superadminSetDashboard,
  superadminSetOwnerAdminPin,
  superadminSetPlan,
  superadminSetPublicMenu,
  superadminUpdateSubdomain,
} from "@/app/superadmin/actions";
import type { TenantPlan, TenantRow } from "@/lib/supabase/tenant-types";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

type Props = {
  initialTenants: TenantRow[];
  /** tenant_id → toplam sipariş (tüm kanallar) */
  orderCounts?: Record<string, number>;
  loadError: string | null;
};

export default function SuperadminTenantCards({
  initialTenants,
  orderCounts = {},
  loadError,
}: Props) {
  const router = useRouter();
  const panelTitleId = useId();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subInputs, setSubInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])),
  );
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubInputs(Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])));
    setPinInputs({});
  }, [initialTenants]);

  const q = search.trim().toLowerCase();
  const filtered = initialTenants.filter((t) => {
    if (!q) return true;
    return (
      t.business_name.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q) ||
      t.owner_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  });

  const selected = selectedId ? (filtered.find((t) => t.id === selectedId) ?? null) : null;

  useEffect(() => {
    if (selectedId && !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    function apply() {
      document.body.style.overflow = mq.matches ? "hidden" : "";
    }
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [selectedId]);

  function run(p: Promise<{ error?: string }>) {
    startTransition(async () => {
      setErr(null);
      const r = await p;
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

  function toggleSelect(id: string) {
    setSelectedId((cur) => (cur === id ? null : id));
  }

  function closePanel() {
    setSelectedId(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">İşletmeler</h1>
          <p className="mt-1 text-sm text-secondary">{initialTenants.length} kayıtlı restoran</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İşletme, subdomain veya sahip ara…"
          className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-sm"
        />
      </header>

      {loadError ? (
        <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error sm:mb-6">
          {loadError}
        </p>
      ) : null}
      {err ? (
        <p className="mb-4 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error sm:mb-6">
          {err}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-container-highest py-16 text-center text-secondary">
          {q ? "Arama sonucu yok." : "Henüz işletme yok."}
        </p>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          <ul className="min-w-0 flex-1 space-y-3">
            {filtered.map((t) => {
              const active = selectedId === t.id;
              return (
                <li key={t.id}>
                  <article
                    className={[
                      "rounded-2xl border bg-surface-container-lowest shadow-sm transition",
                      active
                        ? "border-primary/40 ring-2 ring-primary/15"
                        : "border-surface-container-highest hover:border-primary/20",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-low">
                          {t.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[26px] text-secondary">
                              store
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-headline text-base font-bold sm:text-lg">
                            {t.business_name}
                          </h2>
                          <p className="truncate font-mono text-[11px] text-primary sm:text-xs">
                            {t.subdomain}.kendisepetim.com
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge
                              active={t.plan === "premium"}
                              label={t.plan === "premium" ? "Premium" : "Free"}
                            />
                            <Badge active={t.public_menu_enabled} label="QR" />
                            <Badge active={t.marketplace_enabled} label="Market" />
                            <Badge active={t.dashboard_enabled} label="Panel" />
                          </div>
                        </div>
                        <div
                          className="shrink-0 text-right"
                          title="QR, paket, gel-al ve masa siparişleri toplamı"
                        >
                          <p className="font-headline text-xl font-extrabold tabular-nums leading-none text-on-background sm:text-2xl">
                            {(orderCounts[t.id] ?? 0).toLocaleString("tr-TR")}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                            Sipariş
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch lg:w-28">
                        <button
                          type="button"
                          onClick={() => toggleSelect(t.id)}
                          className={[
                            "inline-flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                            active
                              ? "bg-primary text-on-primary"
                              : "border border-surface-container-highest text-on-background hover:bg-surface-container-low",
                          ].join(" ")}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {active ? "close" : "tune"}
                          </span>
                          {active ? "Kapat" : "Yönet"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-surface-container-highest px-4 py-3 text-xs text-secondary sm:px-5">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Sahip:{" "}
                          <span className="font-medium text-on-background">{t.owner_name}</span>
                        </span>
                        <span className="truncate">{t.email}</span>
                        <span>
                          Kayıt:{" "}
                          {new Date(t.created_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          {/* Desktop: sağ panel — yalnızca seçili restoran */}
          {selected ? (
            <aside className="hidden w-[22rem] shrink-0 lg:sticky lg:top-6 lg:block xl:w-[24rem]">
              <div className="rounded-2xl border border-primary/25 bg-surface-container-lowest p-5 shadow-sm">
                <TenantManagePanel
                  titleId={panelTitleId}
                  tenant={selected}
                  pending={pending}
                  subValue={subInputs[selected.id] ?? selected.subdomain}
                  pinValue={pinInputs[selected.id] ?? ""}
                  onSubChange={(v) => setSubInputs((s) => ({ ...s, [selected.id]: v }))}
                  onPinChange={(v) => setPinInputs((s) => ({ ...s, [selected.id]: v }))}
                  onClose={closePanel}
                  run={run}
                />
              </div>
            </aside>
          ) : null}
        </div>
      )}

      {/* Mobil: sağdan kayan çekmece */}
      {selected ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Paneli kapat"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closePanel}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,22rem)] max-w-full flex-col border-l border-surface-container-highest bg-surface-container-lowest shadow-2xl"
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <TenantManagePanel
                titleId={panelTitleId}
                tenant={selected}
                pending={pending}
                subValue={subInputs[selected.id] ?? selected.subdomain}
                pinValue={pinInputs[selected.id] ?? ""}
                onSubChange={(v) => setSubInputs((s) => ({ ...s, [selected.id]: v }))}
                onPinChange={(v) => setPinInputs((s) => ({ ...s, [selected.id]: v }))}
                onClose={closePanel}
                run={run}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function TenantManagePanel({
  titleId,
  tenant: t,
  pending,
  subValue,
  pinValue,
  onSubChange,
  onPinChange,
  onClose,
  run,
}: {
  titleId: string;
  tenant: TenantRow;
  pending: boolean;
  subValue: string;
  pinValue: string;
  onSubChange: (v: string) => void;
  onPinChange: (v: string) => void;
  onClose: () => void;
  run: (p: Promise<{ error?: string }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Yönetim</p>
          <h3 id={titleId} className="mt-0.5 truncate font-headline text-lg font-bold">
            {t.business_name}
          </h3>
          <p className="truncate font-mono text-xs text-primary">{t.subdomain}.kendisepetim.com</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-container-highest text-secondary hover:bg-surface-container-low hover:text-on-background"
          aria-label="Kapat"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <Field label="Subdomain">
        <div className="flex gap-2">
          <input
            value={subValue}
            disabled={pending}
            onChange={(e) => onSubChange(e.target.value.toLowerCase())}
            className="min-w-0 flex-1 rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs"
          />
          <button
            type="button"
            disabled={pending || subValue === t.subdomain}
            onClick={() => run(superadminUpdateSubdomain(t.id, subValue))}
            className="shrink-0 rounded-lg bg-primary px-2 py-1.5 text-xs font-bold text-on-primary disabled:opacity-40"
          >
            Kaydet
          </button>
        </div>
      </Field>

      <Field label="Plan">
        <select
          value={t.plan}
          disabled={pending}
          onChange={(e) => run(superadminSetPlan(t.id, e.target.value as TenantPlan))}
          className="w-full rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 text-xs font-semibold"
        >
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </Field>

      <Field label="Patron PIN (4 hane)">
        <div className="flex gap-2">
          <input
            value={pinValue}
            disabled={pending}
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-20 rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs"
          />
          <button
            type="button"
            disabled={pending || pinValue.length !== 4}
            onClick={() => run(superadminSetOwnerAdminPin(t.id, pinValue))}
            className="rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-bold text-primary disabled:opacity-40"
          >
            {t.owner_admin_pin_set_at ? "Sıfırla" : "Oluştur"}
          </button>
        </div>
      </Field>

      <div className="flex flex-wrap gap-2">
        <ToggleBtn
          label="QR menü"
          on={t.public_menu_enabled}
          disabled={pending}
          onClick={() => run(superadminSetPublicMenu(t.id, !t.public_menu_enabled))}
        />
        <ToggleBtn
          label="Marketplace"
          on={t.marketplace_enabled}
          disabled={pending}
          onClick={() => run(superadminSetMarketplace(t.id, !t.marketplace_enabled))}
        />
        <ToggleBtn
          label="Panel"
          on={t.dashboard_enabled}
          disabled={pending}
          onClick={() => run(superadminSetDashboard(t.id, !t.dashboard_enabled))}
        />
      </div>
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        active ? "bg-emerald-500/15 text-emerald-900" : "bg-surface-container-high text-secondary",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-secondary">{label}</p>
      {children}
    </div>
  );
}

function ToggleBtn({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-[11px] font-bold",
        on ? "bg-emerald-600/15 text-emerald-900" : "bg-surface-container-high text-secondary",
      ].join(" ")}
    >
      {label}: {on ? "Açık" : "Kapalı"}
    </button>
  );
}
