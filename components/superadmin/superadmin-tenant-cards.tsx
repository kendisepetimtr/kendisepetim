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
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialTenants: TenantRow[];
  loadError: string | null;
};

export default function SuperadminTenantCards({ initialTenants, loadError }: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subInputs, setSubInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])),
  );
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubInputs(Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])));
    setPinInputs({});
  }, [initialTenants]);

  function run(p: Promise<{ error?: string }>) {
    startTransition(async () => {
      setErr(null);
      const r = await p;
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">İşletmeler</h1>
          <p className="mt-1 text-sm text-secondary">{initialTenants.length} kayıtlı restoran</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İşletme, subdomain veya sahip ara…"
          className="w-full max-w-sm rounded-xl border border-surface-container-highest bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{loadError}</p>
      ) : null}
      {err ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{err}</p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-container-highest py-16 text-center text-secondary">
          {q ? "Arama sonucu yok." : "Henüz işletme yok."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const expanded = expandedId === t.id;
            return (
              <article
                key={t.id}
                className="flex flex-col rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm transition hover:border-primary/20"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-low">
                      {t.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[26px] text-secondary">store</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-headline text-lg font-bold">{t.business_name}</h2>
                      <p className="truncate font-mono text-xs text-primary">{t.subdomain}.kendisepetim.com</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge active={t.plan === "premium"} label={t.plan === "premium" ? "Premium" : "Free"} />
                    <Badge active={t.public_menu_enabled} label="QR" />
                    <Badge active={t.marketplace_enabled} label="Market" />
                    <Badge active={t.dashboard_enabled} label="Panel" />
                  </div>

                  <dl className="mt-4 space-y-1 text-xs text-secondary">
                    <div className="flex justify-between gap-2">
                      <dt>Sahip</dt>
                      <dd className="truncate text-right font-medium text-on-background">{t.owner_name}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>E-posta</dt>
                      <dd className="truncate text-right">{t.email}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Kayıt</dt>
                      <dd>
                        {new Date(t.created_at).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-auto border-t border-surface-container-highest p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-surface-container-highest py-2.5 text-sm font-semibold text-on-background hover:bg-surface-container-low"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {expanded ? "expand_less" : "tune"}
                    </span>
                    {expanded ? "Kapat" : "Yönet"}
                  </button>

                  {expanded ? (
                    <div className="mt-4 space-y-4 border-t border-surface-container-high pt-4">
                      <Field label="Subdomain">
                        <div className="flex gap-2">
                          <input
                            value={subInputs[t.id] ?? t.subdomain}
                            disabled={pending}
                            onChange={(e) =>
                              setSubInputs((s) => ({ ...s, [t.id]: e.target.value.toLowerCase() }))
                            }
                            className="min-w-0 flex-1 rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs"
                          />
                          <button
                            type="button"
                            disabled={pending || (subInputs[t.id] ?? t.subdomain) === t.subdomain}
                            onClick={() =>
                              run(superadminUpdateSubdomain(t.id, subInputs[t.id] ?? t.subdomain))
                            }
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
                            value={pinInputs[t.id] ?? ""}
                            disabled={pending}
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="1234"
                            onChange={(e) =>
                              setPinInputs((s) => ({
                                ...s,
                                [t.id]: e.target.value.replace(/\D/g, "").slice(0, 4),
                              }))
                            }
                            className="w-20 rounded-lg border border-surface-container-highest bg-white px-2 py-1.5 font-mono text-xs"
                          />
                          <button
                            type="button"
                            disabled={pending || (pinInputs[t.id] ?? "").length !== 4}
                            onClick={() => run(superadminSetOwnerAdminPin(t.id, pinInputs[t.id] ?? ""))}
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
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
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
