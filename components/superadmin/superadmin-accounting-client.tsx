"use client";

import {
  superadminDeleteAccountingEntry,
  superadminUpsertAccountingEntry,
} from "@/app/superadmin/actions";
import {
  ACCOUNTING_CATEGORIES,
  currentYearMonth,
  formatAccountingTry,
  monthLabel,
  parseYearMonth,
  type AccountingMonthSummary,
  type PlatformAccountingEntryRow,
} from "@/lib/superadmin/accounting-types";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

type Props = {
  initialEntries: PlatformAccountingEntryRow[];
  initialMonthKey: string;
  loadError: string | null;
};

type FormState = {
  id: string | null;
  entryType: "income" | "expense";
  title: string;
  amount: string;
  category: string;
  notes: string;
  entryDate: string;
  isMonthlyRecurring: boolean;
  recurringDay: string;
};

function emptyForm(entryType: "income" | "expense" = "expense"): FormState {
  return {
    id: null,
    entryType,
    title: "",
    amount: "",
    category: ACCOUNTING_CATEGORIES[entryType][0],
    notes: "",
    entryDate: new Date().toISOString().slice(0, 10),
    isMonthlyRecurring: entryType === "expense",
    recurringDay: "1",
  };
}

function buildSummary(entries: PlatformAccountingEntryRow[], year: number, month: number): AccountingMonthSummary {
  const applies = (e: PlatformAccountingEntryRow) => {
    if (e.is_monthly_recurring) return true;
    const [y, m] = e.entry_date.split("-").map(Number);
    return y === year && m === month;
  };
  const incomeItems = entries.filter((e) => e.entry_type === "income" && applies(e));
  const expenseItems = entries.filter((e) => e.entry_type === "expense" && applies(e));
  const incomeTotal = incomeItems.reduce((s, e) => s + e.amount, 0);
  const expenseTotal = expenseItems.reduce((s, e) => s + e.amount, 0);
  return {
    year,
    month,
    label: monthLabel(year, month),
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    incomeItems,
    expenseItems,
  };
}

export default function SuperadminAccountingClient({ initialEntries, initialMonthKey, loadError }: Props) {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = parseYearMonth(monthKey) ?? currentYearMonth();
  const summary = useMemo(
    () => buildSummary(initialEntries, parsed.year, parsed.month),
    [initialEntries, parsed.year, parsed.month],
  );

  const recurringExpenses = initialEntries.filter((e) => e.entry_type === "expense" && e.is_monthly_recurring);

  function openCreate(type: "income" | "expense") {
    setForm(emptyForm(type));
    setFormOpen(true);
    setErr(null);
  }

  function openEdit(entry: PlatformAccountingEntryRow) {
    setForm({
      id: entry.id,
      entryType: entry.entry_type,
      title: entry.title,
      amount: String(entry.amount),
      category: entry.category || ACCOUNTING_CATEGORIES[entry.entry_type][0],
      notes: entry.notes,
      entryDate: entry.entry_date,
      isMonthlyRecurring: entry.is_monthly_recurring,
      recurringDay: String(entry.recurring_day ?? 1),
    });
    setFormOpen(true);
    setErr(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    startTransition(async () => {
      setErr(null);
      const result = await superadminUpsertAccountingEntry({
        id: form.id ?? undefined,
        entryType: form.entryType,
        title: form.title,
        amount,
        category: form.category,
        notes: form.notes,
        entryDate: form.isMonthlyRecurring ? undefined : form.entryDate,
        isMonthlyRecurring: form.isMonthlyRecurring,
        recurringDay: form.isMonthlyRecurring ? Number(form.recurringDay) : null,
      });
      if (result.error) {
        setErr(result.error);
        return;
      }
      setFormOpen(false);
      setForm(emptyForm());
      router.refresh();
    });
  }

  function handleDelete(entryId: string) {
    if (!window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      setErr(null);
      const result = await superadminDeleteAccountingEntry(entryId);
      if (result.error) setErr(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Muhasebe</h1>
          <p className="mt-1 text-sm text-secondary">Platform gelirleri ve giderleri</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => openCreate("income")}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            + Gelir
          </button>
          <button
            type="button"
            onClick={() => openCreate("expense")}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-on-primary"
          >
            + Gider
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {loadError}
        </p>
      ) : null}
      {err ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{err}</p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard label={`${summary.label} — Gelir`} value={formatAccountingTry(summary.incomeTotal)} tone="income" />
        <SummaryCard label={`${summary.label} — Gider`} value={formatAccountingTry(summary.expenseTotal)} tone="expense" />
        <SummaryCard label="Net" value={formatAccountingTry(summary.netTotal)} tone="net" net={summary.netTotal} />
      </div>

      {recurringExpenses.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h2 className="font-headline text-sm font-bold text-amber-950">Aylık sabit giderler</h2>
          <p className="mt-1 text-xs text-amber-900/80">Her ay otomatik olarak gider toplamına dahil edilir.</p>
          <ul className="mt-3 space-y-2">
            {recurringExpenses.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-white/80 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">{e.title}</p>
                  <p className="text-xs text-secondary">
                    {e.category || "Gider"} · Her ayın {e.recurring_day ?? 1}. günü
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-headline text-sm font-bold text-red-800">
                    {formatAccountingTry(e.amount)}
                  </span>
                  <button type="button" onClick={() => openEdit(e)} className="text-xs font-bold text-primary">
                    Düzenle
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <EntryList
          title="Gelirler"
          items={summary.incomeItems}
          emptyText="Bu ay gelir kaydı yok."
          onEdit={openEdit}
          onDelete={handleDelete}
          pending={pending}
        />
        <EntryList
          title="Giderler"
          items={summary.expenseItems}
          emptyText="Bu ay gider kaydı yok."
          onEdit={openEdit}
          onDelete={handleDelete}
          pending={pending}
        />
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-xl">
            <h2 className="font-headline text-lg font-bold">
              {form.id ? "Kaydı düzenle" : form.entryType === "income" ? "Gelir ekle" : "Gider ekle"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="font-semibold">Başlık</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  placeholder="Örn. Vercel sunucu"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Tutar (₺)</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  placeholder="0"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Kategori</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                >
                  {ACCOUNTING_CATEGORIES[form.entryType].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {form.entryType === "expense" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isMonthlyRecurring}
                    onChange={(e) => setForm((f) => ({ ...f, isMonthlyRecurring: e.target.checked }))}
                  />
                  <span className="font-semibold">Aylık sabit gider (her ay tekrarlar)</span>
                </label>
              ) : null}
              {form.isMonthlyRecurring ? (
                <label className="block text-sm">
                  <span className="font-semibold">Ayın günü (1–28)</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={form.recurringDay}
                    onChange={(e) => setForm((f) => ({ ...f, recurringDay: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  />
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="font-semibold">Tarih</span>
                  <input
                    type="date"
                    required
                    value={form.entryDate}
                    onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  />
                </label>
              )}
              <label className="block text-sm">
                <span className="font-semibold">Not (opsiyonel)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary disabled:opacity-60"
                >
                  {pending ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  net,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "net";
  net?: number;
}) {
  const color =
    tone === "income"
      ? "text-emerald-800"
      : tone === "expense"
        ? "text-red-800"
        : (net ?? 0) >= 0
          ? "text-emerald-900"
          : "text-red-800";
  return (
    <div className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <p className={`mt-2 font-headline text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function EntryList({
  title,
  items,
  emptyText,
  onEdit,
  onDelete,
  pending,
}: {
  title: string;
  items: PlatformAccountingEntryRow[];
  emptyText: string;
  onEdit: (e: PlatformAccountingEntryRow) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  return (
    <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm">
      <h2 className="border-b border-surface-container-highest px-5 py-4 font-headline text-base font-bold">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-secondary">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-surface-container-high">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-on-background">
                  {e.title}
                  {e.is_monthly_recurring ? (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      Aylık
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-secondary">
                  {e.category || "—"}
                  {!e.is_monthly_recurring
                    ? ` · ${new Date(e.entry_date).toLocaleDateString("tr-TR")}`
                    : ` · Ayın ${e.recurring_day ?? 1}. günü`}
                </p>
                {e.notes ? <p className="mt-1 text-xs text-secondary">{e.notes}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p
                  className={[
                    "font-headline text-base font-bold",
                    e.entry_type === "income" ? "text-emerald-800" : "text-red-800",
                  ].join(" ")}
                >
                  {e.entry_type === "income" ? "+" : "−"}
                  {formatAccountingTry(e.amount)}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onEdit(e)}
                    className="text-xs font-bold text-primary"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(e.id)}
                    className="text-xs font-bold text-error"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
