"use client";

import {
  superadminSetMarketplace,
  superadminSetDashboard,
  superadminSetOwnerAdminPin,
  superadminSetPlan,
  superadminSetPublicMenu,
  superadminSetTrialEndsAt,
  superadminUpdateSubdomain,
} from "@/app/superadmin/actions";
import type { TenantPlan, TenantRow } from "@/lib/supabase/tenant-types";
import {
  getTenantAccessTier,
  getTrialDaysRemaining,
} from "@/lib/tenant-entitlements";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

type Props = {
  initialTenants: TenantRow[];
  /** tenant_id → toplam sipariş (tüm kanallar) */
  orderCounts?: Record<string, number>;
  /** tenant_id → paket + gel-al/QR benzersiz müşteri */
  customerCounts?: Record<string, number>;
  loadError: string | null;
};

export default function SuperadminTenantCards({
  initialTenants,
  orderCounts = {},
  customerCounts = {},
  loadError,
}: Props) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subInputs, setSubInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])),
  );
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [trialInputs, setTrialInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTenants.map((t) => [t.id, toDateInputValue(t.trial_ends_at)])),
  );

  useEffect(() => {
    setSubInputs(Object.fromEntries(initialTenants.map((t) => [t.id, t.subdomain])));
    setPinInputs({});
    setTrialInputs(Object.fromEntries(initialTenants.map((t) => [t.id, toDateInputValue(t.trial_ends_at)])));
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

  useEffect(() => {
    if (expandedId && !filtered.some((t) => t.id === expandedId)) {
      setExpandedId(null);
    }
  }, [filtered, expandedId]);

  function run(p: Promise<{ error?: string }>) {
    startTransition(async () => {
      setErr(null);
      const r = await p;
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
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
        <ul className="space-y-3">
          {filtered.map((t) => {
            const expanded = expandedId === t.id;
            const panelId = `tenant-panel-${t.id}`;
            return (
              <li key={t.id}>
                <article
                  className={[
                    "overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm transition",
                    expanded
                      ? "border-primary/40 ring-2 ring-primary/15"
                      : "border-surface-container-highest hover:border-primary/20",
                  ].join(" ")}
                >
                  {/* Özet satır */}
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
                            active={t.plan === "premium" || t.plan === "lifetime"}
                            label={
                              t.plan === "lifetime"
                                ? "Ömür boyu"
                                : t.plan === "premium"
                                  ? "Premium"
                                  : "Free"
                            }
                          />
                          <TrialBadge tenant={t} />
                          <Badge active={t.public_menu_enabled} label="QR" />
                          <Badge active={t.marketplace_enabled} label="Market" />
                          <Badge active={t.dashboard_enabled} label="Panel" />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start gap-3 sm:gap-4">
                        <div
                          className="text-right"
                          title="QR, paket, gel-al ve masa siparişleri toplamı"
                        >
                          <p className="font-headline text-xl font-extrabold tabular-nums leading-none text-on-background sm:text-2xl">
                            {(orderCounts[t.id] ?? 0).toLocaleString("tr-TR")}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                            Sipariş
                          </p>
                        </div>
                        <div
                          className="text-right"
                          title="Paket ve gel-al / QR menü siparişlerindeki benzersiz müşteri"
                        >
                          <p className="font-headline text-xl font-extrabold tabular-nums leading-none text-on-background sm:text-2xl">
                            {(customerCounts[t.id] ?? 0).toLocaleString("tr-TR")}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                            Müşteri
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggleExpand(t.id)}
                      className={[
                        "inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:w-auto sm:min-w-[7.5rem]",
                        expanded
                          ? "bg-primary text-on-primary"
                          : "border border-surface-container-highest text-on-background hover:bg-surface-container-low",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {expanded ? "expand_less" : "tune"}
                      </span>
                      {expanded ? "Kapat" : "Yönet"}
                    </button>
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

                  {/* Alta genişleyen yönetim alanı — yalnızca bu restoran */}
                  {expanded ? (
                    <div
                      id={panelId}
                      className="border-t border-primary/15 bg-surface-container-low/40 px-4 py-5 sm:px-5 sm:py-6"
                    >
                      <TenantAccordionBody
                        tenant={t}
                        pending={pending}
                        subValue={subInputs[t.id] ?? t.subdomain}
                        pinValue={pinInputs[t.id] ?? ""}
                        trialValue={trialInputs[t.id] ?? toDateInputValue(t.trial_ends_at)}
                        onSubChange={(v) => setSubInputs((s) => ({ ...s, [t.id]: v }))}
                        onPinChange={(v) => setPinInputs((s) => ({ ...s, [t.id]: v }))}
                        onTrialChange={(v) => setTrialInputs((s) => ({ ...s, [t.id]: v }))}
                        run={run}
                      />
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function TrialBadge({ tenant }: { tenant: TenantRow }) {
  const tier = getTenantAccessTier(tenant);
  if (tier === "lifetime") {
    return <Badge active label="Pilot / ömür boyu" />;
  }
  if (tier === "premium") {
    return <Badge active label="Tam erişim" />;
  }
  if (tier === "trial") {
    const days = getTrialDaysRemaining(tenant);
    return <Badge active label={`Deneme ${days}g`} />;
  }
  return <Badge active={false} label="Deneme bitti" />;
}

function TenantAccordionBody({
  tenant: t,
  pending,
  subValue,
  pinValue,
  trialValue,
  onSubChange,
  onPinChange,
  onTrialChange,
  run,
}: {
  tenant: TenantRow;
  pending: boolean;
  subValue: string;
  pinValue: string;
  trialValue: string;
  onSubChange: (v: string) => void;
  onPinChange: (v: string) => void;
  onTrialChange: (v: string) => void;
  run: (p: Promise<{ error?: string }>) => void;
}) {
  const baseId = useId();
  const tier = getTenantAccessTier(t);
  const daysLeft = getTrialDaysRemaining(t);
  const savedTrial = toDateInputValue(t.trial_ends_at);

  return (
    <div className="space-y-6">
      <Section title="Erişim" hint="QR menü, marketplace ve işletme paneli">
        <div className="space-y-1 rounded-xl border border-surface-container-highest bg-surface-container-lowest p-1 sm:p-2">
          <ToggleRow
            id={`${baseId}-qr`}
            label="QR menü"
            description="Halka açık menü ve QR sipariş"
            checked={t.public_menu_enabled}
            disabled={pending}
            onChange={() => run(superadminSetPublicMenu(t.id, !t.public_menu_enabled))}
          />
          <ToggleRow
            id={`${baseId}-market`}
            label="Marketplace"
            description="Keşfet / restoranlar listesinde görünürlük"
            checked={t.marketplace_enabled}
            disabled={pending}
            onChange={() => run(superadminSetMarketplace(t.id, !t.marketplace_enabled))}
          />
          <ToggleRow
            id={`${baseId}-panel`}
            label="Panel"
            description="İşletme dashboard erişimi"
            checked={t.dashboard_enabled}
            disabled={pending}
            onChange={() => run(superadminSetDashboard(t.id, !t.dashboard_enabled))}
          />
        </div>
      </Section>

      <Section title="Kimlik / plan" hint="Subdomain, paket, deneme süresi ve patron PIN">
        <div className="space-y-4 rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4">
          <Field label="Subdomain">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={subValue}
                disabled={pending}
                onChange={(e) => onSubChange(e.target.value.toLowerCase())}
                className="min-w-0 flex-1 rounded-lg border border-surface-container-highest bg-white px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                disabled={pending || subValue === t.subdomain}
                onClick={() => run(superadminUpdateSubdomain(t.id, subValue))}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40"
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
              className="w-full rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-sm font-semibold sm:max-w-xs"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="lifetime">Ömür boyu (pilot)</option>
            </select>
            <p className="mt-1.5 text-xs text-secondary">
              Premium = ücretli tam erişim. Ömür boyu = pilot/özel restoran, süresiz ücretsiz tam erişim.
              Free = deneme bitince yalnızca QR menü + menü düzenleme.
            </p>
          </Field>

          <Field label="Ücretsiz deneme bitiş">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={trialValue}
                disabled={pending}
                onChange={(e) => onTrialChange(e.target.value)}
                className="rounded-lg border border-surface-container-highest bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending || trialValue === savedTrial}
                onClick={() => run(superadminSetTrialEndsAt(t.id, trialValue))}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40"
              >
                Kaydet
              </button>
              <button
                type="button"
                disabled={pending || !t.trial_ends_at}
                onClick={() => {
                  onTrialChange("");
                  run(superadminSetTrialEndsAt(t.id, ""));
                }}
                className="rounded-lg border border-surface-container-highest px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-container-low disabled:opacity-40"
              >
                Denemeyi kaldır
              </button>
            </div>
            <p className="mt-1.5 text-xs text-secondary">
              {tier === "lifetime"
                ? "Ömür boyu plan aktif — deneme tarihi erişimi etkilemez."
                : tier === "premium"
                  ? "Premium aktif — deneme tarihi erişimi etkilemez."
                  : tier === "trial"
                    ? `Deneme aktif: ${daysLeft} gün kaldı.`
                    : "Deneme yok veya bitti — Free kısıtları geçerli."}
            </p>
          </Field>

          <Field label="Patron PIN (4 hane)">
            <div className="flex flex-wrap gap-2">
              <input
                value={pinValue}
                disabled={pending}
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-24 rounded-lg border border-surface-container-highest bg-white px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                disabled={pending || pinValue.length !== 4}
                onClick={() => run(superadminSetOwnerAdminPin(t.id, pinValue))}
                className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"
              >
                {t.owner_admin_pin_set_at ? "Sıfırla" : "Oluştur"}
              </button>
            </div>
          </Field>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-headline text-sm font-bold text-on-background sm:text-base">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-secondary">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-on-background">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-secondary">{description}</p>
      </div>
      <ToggleSwitch id={id} checked={checked} disabled={disabled} onChange={onChange} label={label} />
    </div>
  );
}

function ToggleSwitch({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={[
        "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
        checked ? "bg-emerald-600" : "bg-surface-container-highest",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
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
