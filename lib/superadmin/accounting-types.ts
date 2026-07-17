export type AccountingEntryType = "income" | "expense";

export type PlatformAccountingEntryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  entry_type: AccountingEntryType;
  title: string;
  amount: number;
  category: string;
  notes: string;
  entry_date: string;
  is_monthly_recurring: boolean;
  recurring_day: number | null;
};

export type AccountingMonthSummary = {
  year: number;
  month: number;
  label: string;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  incomeItems: PlatformAccountingEntryRow[];
  expenseItems: PlatformAccountingEntryRow[];
};

export const ACCOUNTING_CATEGORIES = {
  income: ["Abonelik", "Kurulum", "Komisyon", "Diğer gelir"],
  expense: ["Sunucu", "Domain", "Pazarlama", "Yazılım", "Maaş", "Vergi", "Diğer gider"],
} as const;

export function formatAccountingTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function parseYearMonth(input: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

export function currentYearMonth(): { year: number; month: number; key: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return { year, month, key: `${year}-${String(month).padStart(2, "0")}` };
}
