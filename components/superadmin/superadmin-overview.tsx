import Link from "next/link";
import type { AccountingMonthSummary } from "@/lib/superadmin/accounting-types";
import { formatAccountingTry } from "@/lib/superadmin/accounting-types";
import type { TenantRow } from "@/lib/supabase/tenant-types";

type Props = {
  tenants: TenantRow[];
  accountingSummary: AccountingMonthSummary | null;
  accountingError: string | null;
};

export default function SuperadminOverview({ tenants, accountingSummary, accountingError }: Props) {
  const freeCount = tenants.filter((t) => t.plan === "free").length;
  const premCount = tenants.filter((t) => t.plan === "premium").length;
  const lifetimeCount = tenants.filter((t) => t.plan === "lifetime").length;
  const menuOn = tenants.filter((t) => t.public_menu_enabled).length;
  const recent = tenants.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Genel bakış</h1>
        <p className="mt-1 text-sm text-secondary">Platform özeti ve son işletmeler</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-5">
        <StatCard label="Toplam işletme" value={String(tenants.length)} icon="storefront" />
        <StatCard label="Premium" value={String(premCount)} icon="workspace_premium" accent="amber" />
        <StatCard label="Ömür boyu" value={String(lifetimeCount)} icon="all_inclusive" accent="emerald" />
        <StatCard label="Free" value={String(freeCount)} icon="layers" />
        <StatCard label="QR menü açık" value={String(menuOn)} icon="qr_code_2" />
      </div>

      {accountingSummary ? (
        <section className="mb-8 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-headline text-lg font-bold">Muhasebe — {accountingSummary.label}</h2>
              <p className="mt-1 text-sm text-secondary">Bu ayki gelir, gider ve net</p>
            </div>
            <Link
              href="/superadmin/muhasebe"
              className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/15"
            >
              Muhasebeye git
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MoneyPill label="Gelir" amount={accountingSummary.incomeTotal} tone="income" />
            <MoneyPill label="Gider" amount={accountingSummary.expenseTotal} tone="expense" />
            <MoneyPill label="Net" amount={accountingSummary.netTotal} tone="net" />
          </div>
        </section>
      ) : accountingError ? (
        <p className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-on-background">
          Muhasebe tablosu henüz yok veya yüklenemedi. Supabase&apos;de{" "}
          <code className="text-xs">20260717180000_platform_accounting.sql</code> migration&apos;ını uygulayın.
          {accountingError ? ` (${accountingError})` : null}
        </p>
      ) : null}

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-surface-container-highest px-5 py-4">
          <h2 className="font-headline text-base font-bold">Son kayıtlar</h2>
          <Link href="/superadmin/isletmeler" className="text-xs font-bold text-primary hover:underline">
            Tümünü gör
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-secondary">Henüz işletme yok.</p>
        ) : (
          <ul className="divide-y divide-surface-container-high">
            {recent.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-on-background">{t.business_name}</p>
                  <p className="text-xs text-secondary">
                    {t.subdomain}.kendisepetim.com · {t.owner_name}
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                    t.plan === "lifetime"
                      ? "bg-emerald-500/15 text-emerald-900"
                      : t.plan === "premium"
                        ? "bg-amber-500/15 text-amber-900"
                        : "bg-surface-container-high text-secondary",
                  ].join(" ")}
                >
                  {t.plan === "lifetime" ? "ömür boyu" : t.plan}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "amber" | "emerald";
}) {
  const iconTone =
    accent === "amber"
      ? "bg-amber-500/15 text-amber-800"
      : accent === "emerald"
        ? "bg-emerald-500/15 text-emerald-800"
        : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary sm:text-xs">{label}</p>
          <p className="mt-1.5 font-headline text-2xl font-extrabold sm:mt-2 sm:text-3xl">{value}</p>
        </div>
        <span className={`inline-flex shrink-0 rounded-xl p-1.5 sm:p-2 ${iconTone}`}>
          <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{icon}</span>
        </span>
      </div>
    </div>
  );
}

function MoneyPill({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: "income" | "expense" | "net";
}) {
  const color =
    tone === "income"
      ? "text-emerald-800"
      : tone === "expense"
        ? "text-red-800"
        : amount >= 0
          ? "text-emerald-900"
          : "text-red-800";
  return (
    <div className="rounded-xl border border-surface-container-highest bg-surface-container-low/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <p className={`mt-1 font-headline text-xl font-extrabold ${color}`}>{formatAccountingTry(amount)}</p>
    </div>
  );
}
