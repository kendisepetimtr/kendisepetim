import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import type {
  AccountingMonthSummary,
  PlatformAccountingEntryRow,
} from "@/lib/superadmin/accounting-types";
import { monthLabel } from "@/lib/superadmin/accounting-types";

function rowAmount(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(row: Record<string, unknown>): PlatformAccountingEntryRow {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    entry_type: row.entry_type === "expense" ? "expense" : "income",
    title: String(row.title ?? ""),
    amount: rowAmount(row.amount),
    category: String(row.category ?? ""),
    notes: String(row.notes ?? ""),
    entry_date: String(row.entry_date).slice(0, 10),
    is_monthly_recurring: row.is_monthly_recurring === true,
    recurring_day:
      row.recurring_day != null && Number.isFinite(Number(row.recurring_day))
        ? Number(row.recurring_day)
        : null,
  };
}

function entryAppliesToMonth(entry: PlatformAccountingEntryRow, year: number, month: number): boolean {
  if (entry.is_monthly_recurring) return true;
  const [y, m] = entry.entry_date.split("-").map(Number);
  return y === year && m === month;
}

export async function loadAllAccountingEntries(): Promise<{
  ok: true;
  entries: PlatformAccountingEntryRow[];
} | { ok: false; error: string }> {
  try {
    const svc = createServiceSupabaseClient();
    const { data, error } = await svc
      .from("platform_accounting_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıtlar yüklenemedi." };
  }
}

export function buildAccountingMonthSummary(
  entries: PlatformAccountingEntryRow[],
  year: number,
  month: number,
): AccountingMonthSummary {
  const incomeItems = entries.filter((e) => e.entry_type === "income" && entryAppliesToMonth(e, year, month));
  const expenseItems = entries.filter((e) => e.entry_type === "expense" && entryAppliesToMonth(e, year, month));
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

export type AccountingEntryInput = {
  id?: string;
  entryType: "income" | "expense";
  title: string;
  amount: number;
  category?: string;
  notes?: string;
  entryDate?: string;
  isMonthlyRecurring?: boolean;
  recurringDay?: number | null;
};

export async function upsertAccountingEntry(
  input: AccountingEntryInput,
): Promise<{ ok: true; entry: PlatformAccountingEntryRow } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Başlık zorunludur." };
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { ok: false, error: "Tutar geçersiz." };
  }

  const isMonthly = input.isMonthlyRecurring === true;
  const recurringDay = isMonthly ? (input.recurringDay ?? 1) : null;
  if (isMonthly && (recurringDay == null || recurringDay < 1 || recurringDay > 28)) {
    return { ok: false, error: "Aylık gider için ayın günü 1–28 arasında olmalıdır." };
  }

  const entryDate = (input.entryDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  const payload = {
    entry_type: input.entryType,
    title,
    amount: Math.round(input.amount * 100) / 100,
    category: (input.category ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    entry_date: entryDate,
    is_monthly_recurring: isMonthly,
    recurring_day: recurringDay,
    updated_at: new Date().toISOString(),
  };

  try {
    const svc = createServiceSupabaseClient();
    if (input.id) {
      const { data, error } = await svc
        .from("platform_accounting_entries")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error || !data) return { ok: false, error: error?.message ?? "Kayıt güncellenemedi." };
      return { ok: true, entry: normalizeRow(data as Record<string, unknown>) };
    }

    const { data, error } = await svc
      .from("platform_accounting_entries")
      .insert(payload)
      .select("*")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Kayıt eklenemedi." };
    return { ok: true, entry: normalizeRow(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt kaydedilemedi." };
  }
}

export async function deleteAccountingEntry(
  entryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!entryId) return { ok: false, error: "Geçersiz kayıt." };
  try {
    const svc = createServiceSupabaseClient();
    const { error } = await svc.from("platform_accounting_entries").delete().eq("id", entryId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kayıt silinemedi." };
  }
}
